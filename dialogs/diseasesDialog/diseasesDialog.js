const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, DateTimePrompt } = require('botbuilder-dialogs');
const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');

const { DiseasesData } = require('../../data/diseasesData');

// Dialog IDs 
const DISEASE_DIALOG = 'profileDialog';

// Prompt IDs
const ATTACHMENT_PROMPT = 'attachmentPrompt';
const SELECTION_PROMPT = 'selectionPrompt';
const DATE_PROMPT = 'datePrompt';
class DiseasesDialog extends ComponentDialog {
    constructor(dialogId, UserDataCropAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!UserDataCropAccessor) throw ('Missing parameter.  UserDataCropAccessor is required');

        console.log("constructor of DiseasesDialog");
       

        this.addDialog(new WaterfallDialog(DISEASE_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptNextQuestion.bind(this),
            this.endDiseaseDialog.bind(this),
        ]));

        this.addDialog(new DateTimePrompt(DATE_PROMPT));


        // this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT));
        // this.addDialog(new ChoicePrompt(SELECTION_PROMPT));
        // this.addDialog(new DateTimePrompt(DATE_PROMPT, this.dateValidator));

        this.UserDataCropAccessor = UserDataCropAccessor;
    }
    async initializeStateStep(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        answersData.diseasesData = new DiseasesData();
        //filter diseases and fill diseasesScoreData
        //_initDiseaseDataByAnswers(answersData);

        return await step.next();
    }
    async promptNextQuestion(step) {
        //loop while question!=null
       
        // orderDiseases();
        // const question = getNextQuestion();
        // //answer = sendactivity(question);
        // filterAndScoreByField(field, answer);
        
        return await step.prompt(DATE_PROMPT, 'here you will see dynamic questions');
    }

    getNextQuestion() {

    }

    filterAndScoreByField(field, value) {

    }

    orderDiseases() {

    }

    async endDiseaseDialog(step) {
        return await step.endDialog();
    }

    _initDiseaseDataByAnswers(answersData) {
        _initDataByPicture(picture);
        _initDataByCrop(crop);
        _initDataByLocation(crop, location, plantingDate);
        _initDataBySymptomLocation(symptomLocation);
    }

    _initDataByPicture(picture) {
        //Priority + score
    }

    _initDataByCrop(crop) {
        //filter+score diseases by crop 
    }

    /**_initDataByLocation */
    _initDataByLocation(crop, location, plantingDate) {
        const temperatureList = _calculateTemperature(crop, location, plantingDate);
        const gdd = _calculteGDD(crop, location, plantingDate);
        const growStage = _calculateGrowStageByGDD(crop, plantingDate, gdd);

        //filter+ score diseases
        _filterByTemperatureList(temperatureList);
        _filterByGrowStage(growStage);
        _filterByRegion(location);
    }

    _calculteGDD(crop, location, plantingDate) {
        //weazer aware location, crop, plantingDate
        //returns gdd
    }

    _calculateGrowStageByGDD(crop, plantingDate, gdd) {
        //return object of growstage : small, old..
    }

    _calculateTemperature(crop, location, plantingDate) {
        //weazer get temperature + humidity of last two weeks
        //returns temperature + humidity list
    }

    _filterByTemperatureList(temperatureList) {
        //temperature, humidity,
    }

    _filterByGrowStage(temperatureList) {
        //GrowthStage 
    }

    _filterByRegion(location) {
        //Region
    }
    /**_initDataByLocation */

    _initDataBySymptomLocation(symptomLocation) {
        //filter + score 
        //symptomLocation
    }


}

exports.DiseasesDialog = DiseasesDialog;
