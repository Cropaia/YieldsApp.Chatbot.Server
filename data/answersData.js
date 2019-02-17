class AnswersData {
    constructor() {
        this.picture = undefined;
        this.crop = undefined;
        this.variety = undefined;
        this.plantingDate = undefined;
        this.location = { lat: -34.397, lng: 150.644 };
        this.locationTypes = [];
        this.diseasesData = {};
    }
};

exports.AnswersData = AnswersData;
