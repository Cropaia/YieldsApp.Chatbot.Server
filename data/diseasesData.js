
const diseases = require('./diseases.json')
//const diseasesMetaData = require('./diseases_metadata.json')
const _ = require('lodash');

class DiseasesData {
    constructor(crop)  {
        this.diseases = this._getDiseases();
        this.diseasesScoreData = this._getDiseasesScoreData();
        this.diseasesMetaData = this._getDiseasesMetaData();
        this.answerPicture = [];
        //as diseasesScoreData
        //TODO: to check we can delete it
        this.answerData = {};
        this.crop = crop;
        _.fillData();
    }

    _getDiseases() {
        return require('./diseases.json');
    }

    _getDiseasesScoreData() {
        return _.map(this.diseases, (disease) => {
            return { id: disease.id, fields: [] }
        });
    }

    _getDiseasesMetaData() {
        return require('./diseases_metadata.json');
    }

    _fillData() {
        _.forEach(this.diseases, (disease, index) => {
            const questionsByfields = _.map(disease.policies.questions_order, label => {
                return {
                    "label": label,
                    "questions": _getNexFieldQuestionByLevel(metaData.label, disease)
                }
            });
            disease.questionsByfields = questionsByfields;
        });
    }

    //returnns array of question to this field
    _getNexFieldQuestionByLevel(fieldName, disease) {
        //disease
        let metaData = disease.metaData;
        if (metaData) {
            const fieldQuestion = _.find(metaData, { label: fieldName });
            if (fieldQuestion != null && fieldQuestion.questions && fieldQuestion.questions.length > 0)
                return fieldQuestion;
        }

        //crop
        metaData = this.crop.metaData;
        if (metaData) {
            const fieldQuestion = _.find(metaData, { label: fieldName });
            if (fieldQuestion != null && fieldQuestion.questions && fieldQuestion.questions.length > 0)
                return fieldQuestion;
        }

        //diseaseMetaData
        return _.find(this.diseasesMetaData, { label: fieldName });
    }
    
    static findFieldValue(field, disease, answerData) {
        let userAnswer = false, value = "", objectFields = [];
        const textKeys = field.split(".");
        if (textKeys.length > 1) {
            userAnswer = textKeys[0] == "userAnswer";
            field = textKeys[1];
            objectFields = textKeys.slice(2);
        } else {
            userAnswer = false;
            field = textKeys[0];
        }

        if (userAnswer) {
            value = this._getAnswerDataValue(field, answerData, objectFields)
        } else {
            value = this._getDiseaseValue(field, disease, objectFields)
        }
        return value;
    }

    static _getAnswerDataValue(fieldName, answerData, objectFields) {
        const value = answerData[fieldName];
        return this.calculateValue(value, objectFields);
    }

    static _getDiseaseValue(fieldName, disease, objectFields) {
        let value = disease[fieldName];
        return this.calculateValue(value, objectFields);
    }

    static calculateValue(value, objectFields) {
        if (_.isObject(value)) {
            if (objectFields.length) {
                value = _.get(value, _.join(objectFields, "."));
                return value;
            }
            else
                return "";
        }
        return value;
    }
};

exports.DiseasesData = DiseasesData;
