class AnswersData {
    constructor(crop, variety, plantingDate, location) {
        this.picture = undefined;
        this.crop = crop || undefined;
        this.variety = variety || undefined;
        this.plantingDate = plantingDate || undefined;
        this.location = location || undefined;
        this.symptomLocation =  [];
    }
};

exports.AnswersData = AnswersData;
