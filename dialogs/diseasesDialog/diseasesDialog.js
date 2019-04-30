const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, ConfirmPrompt } = require('botbuilder-dialogs');
const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
const _ = require('lodash');
const fs = require('fs');
const FormData = require('form-data');
const { getAwareNorms } = require('./aware-api');

const { DiseasesData } = require('../../data/diseasesData');
const { DiseasesCondition } = require('./diseasesCondition');
// Dialog IDs 
const DISEASE_DIALOG = 'profileDialog';

// Prompt IDs
const ATTACHMENT_PROMPT = 'attachmentPrompt';
const NEXT_QUESTION_DIALOG = 'nextQuestionDialog';
const YESNO_PROMPT = 'yesnoPrompt';
const SELECTION_PROMPT = 'selectionPromp';

const QuestionType = {
    Options: 1,
    YesNo: 0
}

class DiseasesDialog extends ComponentDialog {
    constructor(dialogId, UserDataCropAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!UserDataCropAccessor) throw ('Missing parameter.  UserDataCropAccessor is required');

        console.log("constructor of DiseasesDialog");

        this.addDialog(new WaterfallDialog(DISEASE_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptNextQuestion.bind(this),
            this.endDiseaseDialog.bind(this),
        ]));


        this.dialogs.add(new WaterfallDialog(NEXT_QUESTION_DIALOG)
            .addStep(this.selectionStep.bind(this))
            .addStep(this.loopStep.bind(this)));

        this.dialogs
            .add(new ChoicePrompt(SELECTION_PROMPT))
            .add(new ConfirmPrompt(YESNO_PROMPT))

        this.UserDataCropAccessor = UserDataCropAccessor;
    }
    async initializeStateStep(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        answersData.diseasesData = new DiseasesData();
        await this._initDiseaseDataByAnswers(answersData);

        return await step.next();
    }
    async promptNextQuestion(step) {
        return await step.beginDialog(NEXT_QUESTION_DIALOG);
    }

    async selectionStep(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);

        this.calculateDiseasesScore(answersData.diseasesData);
        this.orderDiseases(answersData.diseasesData);
        const countDiseases = answersData.diseasesData.diseases.length;
        if (countDiseases == 1) {
            const disease = answersData.diseasesData.diseases[0];
            const diseaseScore = answersData.diseasesData.diseasesScoreData[0];
            const score = this._calculateFinalScore(diseaseScore)
            await step.context.sendActivity(`Your Disease is ${disease.commonName} with score of ${score}`);
            return await step.endDialog()
        } else if (countDiseases == 0) {
            await step.context.sendActivity(`Didn't found your disease`);
            return await step.endDialog()
        }


        const disease = answersData.diseasesData.diseases[0];
        const diseaseScore = answersData.diseasesData.diseasesScoreData[0];
        const crop = answersData.crop;
        const nextQuestion = this._getNextQuestion(answersData.diseasesData.diseasesMetaData, disease, diseaseScore, crop);
        if (nextQuestion == null) {
            const score = this._calculateFinalScore(diseaseScore)
            await step.context.sendActivity(`Your Disease is ${disease.commonName} with score of ${score}`);
            return await step.endDialog()
        }
        answersData.nextQuestion = nextQuestion;
        answersData.disease = disease;
        answersData.diseaseIndex = 0;

        return await this._prompQuestion(step, disease, answersData.diseasesData, nextQuestion);
    }

    async _prompQuestion(step, disease, diseasesData, nextQuestion) {
        const message = this._getMessageQuestion(disease, diseasesData, nextQuestion);
        const question = nextQuestion.question;
        if (question.type == QuestionType.Options) {
            question.listOptions = _.concat(question.options, question.defulatOptions || []);
            let list = question.listOptions.map((option) => {
                return option.name;
            });
            return await step.prompt(SELECTION_PROMPT, {
                prompt: message,
                choices: list
            });
        } else {
            return await step.prompt(YESNO_PROMPT, {
                prompt: message
            });
        }
    }

    async loopStep(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        const question = answersData.nextQuestion.question;
        const fieldQuestion = answersData.nextQuestion.fieldQuestion;
        const answerResult = step.result;
        const disease = answersData.diseasesData.diseases[answersData.diseaseIndex];
        let value, answer;
        if (question.type == QuestionType.Options) {
            answer = question;
            value = question.listOptions[answerResult.index];
        }
        else {//YESNO_PROMPT
            answer = question.answers[answerResult];
            value = answer.value; //TODO: to calculte value
        }
        answersData.diseasesData.answerData[fieldQuestion.label] = value;
        const currentDiseaseScoreData = answersData.diseasesData.diseasesScoreData[answersData.diseaseIndex];
        let field = _.find(currentDiseaseScoreData.fields, { name: fieldQuestion.label })
        if (!field) {
            field = {};
            currentDiseaseScoreData.fields.push(field);
        }
        field.value = value;
        field.name = fieldQuestion.label;
        const score = this._getFirstScore(disease, currentDiseaseScoreData, answer.score_number);
        //TODO: if score = null
        field.score = score.value;

        if (answer.filter) {
            if (this._checkCondition(disease, currentDiseaseScoreData, answer.filter_conditions)) {
                answersData.diseasesData.diseases.splice(answersData.diseaseIndex, 1);
                answersData.diseasesData.diseasesScoreData.splice(answersData.diseaseIndex, 1);
                return await step.replaceDialog(NEXT_QUESTION_DIALOG);
            }
        }

        return await step.replaceDialog(NEXT_QUESTION_DIALOG);
    }
    _getFirstScore(disease, diseaseScoreData, scoreList) {
        return _.first(scoreList, (score) => {
            return _checkCondition(disease, diseaseScoreData, score.conditions);
        })
    }
    _calculateFinalScore(diseaseScore) {
        //TODO: to return patogen Class
        return 0.8 * 100;
    }
    _getNextQuestion(diseasesMetaData, disease, diseaseScore, crop) {
        let fieldQuestion = null;;
        while (disease.policies.questions_order.length > 0) {
            const fieldName = disease.policies.questions_order[0];
            fieldQuestion = this._getNexFieldQuestionByLevel(fieldName, disease, crop, diseasesMetaData);
            let question = null;
            while (fieldQuestion && (fieldQuestion.questions && fieldQuestion.questions.length > 0)) {
                question = fieldQuestion.questions.shift();
                if (this._checkCondition(disease, diseaseScore, question.conditions)) {
                    if (fieldQuestion.questions.length == 0) {
                        //move to next field's question
                        disease.policies.questions_order.shift();
                    }
                    return {
                        question: question,
                        fieldQuestion: fieldQuestion
                    }
                }
            }
            disease.policies.questions_order.shift();
        }

        return null;
    }

    _getNexFieldQuestionByLevel(fieldName, disease, crop, diseasesMetaData) {
        //disease
        let metaData = disease.metaData;
        if (metaData) {
            const fieldQuestion = _.find(metaData, { label: fieldName });
            if (fieldQuestion != null && fieldQuestion.questions && fieldQuestion.questions.length > 0)
                return fieldQuestion;
        }

        //crop
        metaData = crop.metaData;
        if (metaData) {
            const fieldQuestion = _.find(metaData, { label: fieldName });
            if (fieldQuestion != null && fieldQuestion.questions && fieldQuestion.questions.length > 0)
                return fieldQuestion;
        }

        //diseaseMetaData
        return _.find(diseasesMetaData, { label: fieldName });
    }
    _getMessageQuestion(disease, diseasesData, question) {
        let text = question.question.text;
        if (disease[question.fieldQuestion.label]) {
            text = text.replace("{{value}}", disease[question.fieldQuestion.label]);
        }

        let openBracket = 0, closeBracket = 0, textBracketKey = '';
        while (openBracket != -1 && closeBracket != -1) {
            openBracket = text.indexOf("{{", closeBracket);
            if (openBracket != -1) {
                closeBracket = text.indexOf("}}", openBracket);
                if (closeBracket != -1) {
                    textBracketKey = text.substring(openBracket, closeBracket + 2);
                    let userAnswer = false, field = "", value = "";
                    const textKeys = textBracketKey.replace("{{", "").replace("}}", "").split(".");
                    if (textKeys.length > 1) {
                        userAnswer = textKeys[0] == "userAnswer";
                        field = textKeys[1];
                    } else {
                        userAnswer = false;
                        field = textKeys[0];
                    }

                    if (userAnswer) {
                        value = this._getAnswerDataValue(field, diseasesData.answerData)
                    } else {
                        value = this._getDiseaseValue(field, disease)
                    }
                    text = text.replace(textBracketKey, value);
                }
            }
        }


        return text;
    }
    _getAnswerDataValue(field, answerData) {
        const value = answerData[field];
        if (_.isObject(value) && value.value)
            return value.name;
        return value;
    }

    _getDiseaseValue(field, disease) {
        return disease[field];
    }
    _checkCondition(disease, diseaseScoreData, conditions) {
        var diseasesCondition = new DiseasesCondition(disease, diseaseScoreData);
        const result = diseasesCondition.checkConditions(conditions);
        return result;
    }


    calculateDiseasesScore(diseasesData) {
        //TODO:  to calculate fieldCalculate by avg of diseasesScoreData scores
        _.forEach(diseasesData.diseasesScoreData, (diseaseScoreData, index) => {
            const avg = _.meanBy(diseaseScoreData.fields, field => field.score);
            diseasesData.diseases.score.fieldCalculate = avg;

            const currentDisease = diseasesData.diseases[index];
            let finalScore = avg, pictueScore = currentDisease.score.picture;
            if (pictueScore > 0) finalScore = _.mean([finalScore, pictueScore]);
            currentDisease.score.finalScore = finalScore;
        });

    }
    
    orderDiseases(diseasesData) {
        //TODO: to order by finalScore
        //diseases
        //diseasesScoreData
    }

    async endDiseaseDialog(step) {
        return await step.endDialog();
    }

    async _initDiseaseDataByAnswers(answersData) {
        this._initDataByPicture(answersData.diseasesData, answersData.pictures);
        this._initDataByCrop(answersData.diseasesData, answersData.crop);
        await this._initDataByLocation(answersData.diseasesData, answersData.crop, answersData.location, answersData.plantingDate);
        this._initDataBylocationType(answersData.diseasesData, answersData.locationTypes);
    }

    _initDataByPicture(diseasesData, pictures) {
        if (pictures.length == 0) return;
        //TODO: to change image to list of images and looping
        let image = fs.createReadStream(pictures[0].localPath);
        var form = new FormData();
        form.append('image', image);
        form.submit(process.env.PictureAI_Path, function (err, res) {
            res.resume();
            res.on('data', function (chunk) {
                console.log(res.statusCode);
                const result = JSON.parse(chunk);
                let answerPicture = [];
                if (result && result.classes) {
                    result.classes.forEach((clazz, index) => {
                        answerPicture.push({ label: clazz, score: result.proba[index] });

                    });
                }
                answerPicture = _.orderBy(answerPicture, 'score', 'desc');
                diseasesData.answerPicture = answerPicture;
                _.forEach(diseasesData.diseases, disease => {
                    const pictureScore = 0 //_.find(answerPicture,) 
                    //TODO: to find the score in answerPicture by label otherwize= 0
                    disease.score = {
                        picture: pictureScore,
                        fieldCalculate: 0,
                        final: 0
                    };
                });


            });
        });

    }

    _initDataByCrop(diseasesData, crop) {
        //filter+score diseases by crop 
        //now we don't have any filter by crop..
    }

    /**_initDataByLocation */
    async _initDataByLocation(diseasesData, crop, location, plantingDate) {
        const tempList = await this._calculateTemperature(crop, location, plantingDate);
        const GDD = this._calculteGDD(crop, tempList.temperature);
        const growthStage = this._calculateGrowthStageByGDD(crop, GDD);

        //filter+ score diseases
        //this._filterByTemperatureList(diseasesData, tempList);
        this._filterByGrowthStage(diseasesData, growthStage);
        this._filterByRegion(diseasesData, location);
    }

    async _calculateTemperature(crop, location, plantingDate) {
        //weazer get temperature + humidity of last two weeks
        //returns temperature + humidity list

        const list = await getAwareNorms(location, plantingDate);
        const temperatureList = list.temperature;

        const humidityList = list.humidity;

        // let temperatureList = [];
        // let humidityList = [];
        return { temperature: temperatureList, humidity: humidityList };
    }

    _calculteGDD(crop, temperatureList) {
        const minimumTemperatureByCrop = crop.minimumTemperatureForGdd;
        const GDD = _.reduce(temperatureList, (sum, temperature) => {
            if (!sum) sum = 0;
            return sum + (parseInt(temperature.min) + parseInt(temperature.max)) / 2 - minimumTemperatureByCrop;
        });
        return GDD;
    }

    _calculateGrowthStageByGDD(crop, GDD) {
        for (let i = 0; i < crop.growthStages.length; i++) {
            const isLastGrowthStage = i + 1 == crop.growthStages.length;
            if (isLastGrowthStage)
                return crop.growthStages[i];

            const fromGDD = crop.growthStages[i].fromGDD;
            const toGDD = crop.growthStages[i].toGDD;
            if (fromGDD < GDD && GDD < toGDD)
                return crop.growthStages[i];
        }
        return crop.growthStages[0];
    }


    _filterByTemperatureList(diseasesData, temperatureList) {
        //temperature, humidity,
        const diseases = [], diseasesScoreData = [];
        _.forEach(diseasesData.diseases, (disease, index) => {
            const temperature = {
                min: disease.temperature_min,
                max: disease.temperature_max,
                standardDeviationMin: disease.temperature_standardDeviationMin,
                standardDeviationMax: disease.temperature_standardDeviationMax,
            }
            const resultTemperature = this._calculateScoreForTemp(temperature, temperatureList.temperature);
            if (resultTemperature.isFilterOut) return;
            const humidity = {
                min: disease.humidity_min,
                max: disease.humidity_max,
                standardDeviationMin: disease.humidity_standardDeviationMin,
                standardDeviationMax: disease.humidity_standardDeviationMax,
            }
            const resultHumidity = this._calculateScoreForTemp(humidity, temperatureList.humidity);
            if (resultHumidity.isFilterOut) return;

            const currentDiseaseScoreDate = diseasesData.diseasesScoreData[index];
            currentDiseaseScoreDate.fields.push({
                name: "temperature",
                score: resultTemperature.score
            });
            currentDiseaseScoreDate.fields.push({
                name: "humidity",
                score: resultHumidity.score
            });

            diseases.push(disease);
            diseasesScoreData.push(currentDiseaseScoreDate);
        });

        diseasesData.diseases = diseases;
        diseasesData.diseasesScoreData = diseasesScoreData;
    }

    _calculateScoreForTemp(diseaseTemperature, list) {
        let countIn = 0, countInStandardDeviation = 0, countOut = 0;
        let sumAvg = 0;
        const diseaseMin = parseInt(diseaseTemperature.min);
        const diseaseMax = parseInt(diseaseTemperature.max);
        if (!diseaseMin && !diseaseMax) {
            return {
                scoreTemperature: 1,
                isFilterOut: false
            }
        }
        const standardDeviationMin = parseInt(diseaseTemperature.standardDeviationMin);
        const standardDeviationMax = parseInt(diseaseTemperature.standardDeviationMax);

        _.forEach(list, (temperature) => {
            const min = parseInt(temperature.min);
            const max = parseInt(temperature.max);

            sumAvg = sumAvg + ((min + max) / 2);

            if ((!diseaseMin || min >= diseaseMin) && (!diseaseMax || max <= diseaseMax)) {
                countIn++;
            }
            else if ((!standardDeviationMin || min >= standardDeviationMin) && (!standardDeviationMax || max <= standardDeviationMax)) {
                countInStandardDeviation++;
            } else {
                countOut++;
            }
        });
        const avg = sumAvg / list.length;
        let scoreTemperature = (countIn + countInStandardDeviation * 0.5) / list.length;
        return {
            score: scoreTemperature,
            isFilterOut: avg < standardDeviationMin || avg > standardDeviationMax || scoreTemperature < 0.3
        }
    }

    _filterByGrowthStage(diseasesData, growthStage) {
        //GrowthStage 
        const diseases = [], diseasesScoreData = [];
        _.forEach(diseasesData.diseases, (disease, index) => {
            const result = this._calculateScoreForGrowthStage(disease.growthStage, growthStage);
            if (result.isFilterOut) return;

            const currentDiseaseScoreDate = diseasesData.diseasesScoreData[index];
            currentDiseaseScoreDate.fields.push({
                name: "growthStage",
                score: result.score
            });
            diseases.push(disease);
            diseasesScoreData.push(currentDiseaseScoreDate);

        });

        diseasesData.diseases = diseases;
        diseasesData.diseasesScoreData = diseasesScoreData;
    }

    _calculateScoreForGrowthStage(diseaseListGrowthStage, cropGrowthStage) {
        if (_.isEmpty(diseaseListGrowthStage) || diseaseListGrowthStage.length == 0) {
            return {
                score: 1,
                isFilterOut: false
            }
        }

        const currentGrowthStage = _.find(diseaseListGrowthStage, { "name": cropGrowthStage.name });
        if (currentGrowthStage) {
            return {
                score: 1,
                isFilterOut: false
            }
        }
        return {
            score: 0,
            isFilterOut: true
        }
    }
    _filterByRegion(diseasesData, location) {
        //Region
    }
    /**_initDataByLocation */

    _initDataBylocationType(diseasesData, locationTypes) {
        //filter + score 
        //locationType
        const diseases = [], diseasesScoreData = [];
        _.forEach(diseasesData.diseases, (disease, index) => {
            const result = this._calculateScoreForLocationType(disease, locationTypes);
            if (result.isFilterOut) return;

            const currentDiseaseScoreDate = diseasesData.diseasesScoreData[index];
            currentDiseaseScoreDate.fields = currentDiseaseScoreDate.fields.concat(result.fields);
            diseases.push(disease);
            diseasesScoreData.push(currentDiseaseScoreDate);
        });

        diseasesData.diseases = diseases;
        diseasesData.diseasesScoreData = diseasesScoreData;

    }

    _calculateScoreForLocationType(disease, locations) {
        const currentList = _.filter(locations, (location) => {
            const result = _.get(disease, 'location_' + location);
            return result;
        });

        if (currentList.length > 0) {
            const fields = _.map(currentList, (current) => {
                const name = "location_" + current
                return {
                    score: 1,
                    name: name,
                    value: true
                }
            });

            return {
                fields: fields,
                isFilterOut: false
            }
        }
        return {
            fields: [],
            isFilterOut: true
        }
    }


}

exports.DiseasesDialog = DiseasesDialog;
