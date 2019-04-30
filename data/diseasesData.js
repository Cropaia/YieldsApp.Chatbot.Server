
const diseases = require('./diseases.json')
//const diseasesMetaData = require('./diseases_metadata.json')
const _ = require('lodash');

class DiseasesData {
    constructor() {
        this.diseases = this._getDiseases();
        this.diseasesScoreData = this._getDiseasesScoreData();
        this.diseasesMetaData = this._getDiseasesMetaData();
        this.answerPicture = [];
        //as diseasesScoreData
        //TODO: to check we can delete it
        this.answerData = {};
    }

    _getDiseases() {
        return require('./diseases.json');
    }

    _getDiseasesScoreData() {
        return _.map(this.diseases, (disease) => {
            return { id: disease.id, fields: [] }
        });
    }

    _getDiseasesMetaData(){
        return require('./diseases_metadata.json');
    }
};

exports.DiseasesData = DiseasesData;
