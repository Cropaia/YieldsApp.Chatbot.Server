
const diseases = require('./diseases.json')
const _ = require('lodash');

class DiseasesData {
    constructor() {
        this.diseases = this._getDiseases();
        this.diseasesScoreData = this._getdiseasesScoreData();
    }

    _getDiseases() {
        return diseases;
    }

    _getdiseasesScoreData() {
        return _.map(this.diseases, (disease) => {
            return { id: disease.id, fields: [] }
        });
    }
};

exports.DiseasesData = DiseasesData;
