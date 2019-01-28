class UserDataCrop {
    constructor(location, crop, variety, date) {
        this.location = location || undefined;
        this.crop = crop || undefined;
        this.variety = variety || undefined;
        this.date = date || undefined;

    }
};

exports.UserDataCrop = UserDataCrop;
