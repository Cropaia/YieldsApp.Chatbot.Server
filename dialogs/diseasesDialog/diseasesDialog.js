const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, DateTimePrompt } = require('botbuilder-dialogs');
const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');
const _ = require('lodash');
const fs = require('fs');
const FormData = require('form-data');
const { getAwareNorms } = require('./aware-api');

const { DiseasesData } = require('../../data/diseasesData');

// Dialog IDs 
const DISEASE_DIALOG = 'profileDialog';

// Prompt IDs
const ATTACHMENT_PROMPT = 'attachmentPrompt';
const NEXT_QUESTION_DIALOG = 'nextQuestionDialog';
const DATE_PROMPT = 'datePrompt';

const COMPANIES_SELECTED = 'companyselectedPrompt';
const COMPANY_OPTIONS = ["Microsoft", "Google"], DONE_OPTION = "Done";
const SELECTION_PROMPT = 'selectionPromp';

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
            .add(new DateTimePrompt(DATE_PROMPT))
            .add(new ChoicePrompt(SELECTION_PROMPT));

        this.UserDataCropAccessor = UserDataCropAccessor;
    }
    async initializeStateStep(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        answersData.diseasesData = new DiseasesData();
        await this._initDiseaseDataByAnswers(answersData);

        return await step.next();
    }
    async promptNextQuestion(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        console.log(answersData.diseasesData);

        // getQuestionValue
        // filterAndScoreByField(field, answer);

        // orderDiseases();
        // const question = this._getNextQuestion();

        return await step.beginDialog(NEXT_QUESTION_DIALOG);
    }

    async selectionStep(step) {
        // Continue using the same selection list, if any, from the previous iteration of this dialog.
        const list = Array.isArray(step.options) ? step.options : [];
        step.values[COMPANIES_SELECTED] = list;

        // Create a prompt message.
        let message;
        if (list.length === 0) {
            message = 'Please choose a company to review, or `' + DONE_OPTION + '` to finish.';
        } else {
            message = `You have selected **${list[0]}**. You can review an addition company, ` +
                'or choose `' + DONE_OPTION + '` to finish.';
        }

        // Create the list of options to choose from.
        const options = list.length > 0
            ? COMPANY_OPTIONS.filter(function (item) { return item !== list[0] })
            : COMPANY_OPTIONS.slice();
        options.push(DONE_OPTION);

        // Prompt the user for a choice.
        return await step.prompt(SELECTION_PROMPT, {
            prompt: message,
            retryPrompt: 'Please choose an option from the list.',
            choices: options
        });
    }

    async loopStep(step) {
        // Retrieve their selection list, the choice they made, and whether they chose to finish.
        const list = step.values[COMPANIES_SELECTED];
        const choice = step.result;
        const done = choice.value === DONE_OPTION;

        if (!done) {
            // If they chose a company, add it to the list.
            list.push(choice.value);
        }

        if (done || list.length > 1) {
            // If they're done, exit and return their list.
            return await step.endDialog(list);
        } else {
            // Otherwise, repeat this dialog, passing in the list from this iteration.
            return await step.replaceDialog(NEXT_QUESTION_DIALOG, list);
        }
    }

    _getNextQuestion() {



    }

    filterAndScoreByField(field, value) {

    }

    orderDiseases() {

    }

    async endDiseaseDialog(step) {
        return await step.endDialog();
    }

    _initDiseaseDataByAnswers(answersData) {
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
            // res – response object (http.IncomingMessage)  //
            res.resume();
            res.on('data', function (chunk) {
                console.log(res.statusCode);
                const aiProbaList = JSON.parse(chunk);
                //TODO: to order by the specific functions
            });

        });
        let answerPicture = [{ id: 1, score: 0.1 }, { id: 2, score: 0.9 }];
        answerPicture = _.orderBy(answerPicture, 'score', 'desc');
        diseasesData.answerPicture = answerPicture;
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
        this._filterByTemperatureList(diseasesData, tempList);
        this._filterByGrowthStage(diseasesData, growthStage);
        this._filterByRegion(diseasesData, location);
    }

    async _calculateTemperature(crop, location, plantingDate = new Date('01/01/2019')) {
        //weazer get temperature + humidity of last two weeks
        //returns temperature + humidity list
       
      const list=  await getAwareNorms(location,plantingDate);
        const temperatureList = list.temperature;

        const humidityList = list.humidity;

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
            const result = this._calculateScoreForLocationType(disease.locationTypes, locationTypes);
            if (result.isFilterOut) return;

            const currentDiseaseScoreDate = diseasesData.diseasesScoreData[index];
            currentDiseaseScoreDate.fields = currentDiseaseScoreDate.fields.concat(result.fields);
            diseases.push(disease);
            diseasesScoreData.push(currentDiseaseScoreDate);
        });

        diseasesData.diseases = diseases;
        diseasesData.diseasesScoreData = diseasesScoreData;

    }

    _calculateScoreForLocationType(list, selectedList) {
        const currentList = _.intersectionBy(list, selectedList, "name");

        if (currentList.length > 0) {
            const fields = _.map(currentList, (current) => {
                const name = "locationType:" + current.name
                return {
                    score: 1,
                    name: name
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
