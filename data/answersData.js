class AnswersData {
    constructor(location, crop, variety, date) {
        this.picture = picture || undefined;
        this.crop = crop || undefined;
        this.variety = variety || undefined;
        this.plantingDate = plantingDate || undefined;
        this.location = location || undefined;
        this.symptomLocation = symptomLocation || [];
    }
};

exports.AnswersData = AnswersData;
