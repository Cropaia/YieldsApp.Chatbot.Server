class AnswersData {
    constructor(crop, variety, plantingDate, location) {
        this.picture = undefined;
        this.crop = crop || undefined;
        this.variety = variety || undefined;
        this.plantingDate = plantingDate || undefined;
        this.location = location || {lat: -34.397, lng: 150.644};
        this.symptomLocation =  [];
    }
};

exports.AnswersData = AnswersData;
