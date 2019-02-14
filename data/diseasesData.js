
const diseases = require('./diseases.json')
const _ = require('lodash');

class DiseasesData {
    constructor() {
        this.diseases = this.getDiseases();
        this.diseasesScoreData = this.getdiseasesScoreData();
    }

    getDiseases() {
        return diseases;
    }

    getdiseasesScoreData() {
        return _.map(this.diseases, (disease) => {
            return { id: disease.id, fields: [] }
        });
    }
};

exports.DiseasesData = DiseasesData;
