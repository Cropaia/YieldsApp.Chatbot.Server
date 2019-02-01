const { DiseasesData } = require('../data/diseasesData');

class DiseasesProcessor {
    constructor() {
        this.diseasessData = new DiseasesData();
    }
  
    static async createProcessor() {
        try {
            return new DiseasesProcessor();
        } catch (err) {
            throw new Error(err, 'Error occur while creating Azure Diseases client');
        }
    }
    
}
module.exports = DiseasesProcessor;
