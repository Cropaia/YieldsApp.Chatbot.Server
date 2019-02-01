const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, DateTimePrompt } = require('botbuilder-dialogs');
const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');

const { AnswersData } = require('../../data/answersData');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
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
            this.endDiseaseDialog.bind(this),
        ]));
        // this.addDialog(new WaterfallDialog(CROP_DIALOG, [
        //     this.initializeStateStep.bind(this),
        //     this.promptForAttachmentStep.bind(this),
        //     this.promptForCropStep.bind(this),
        //     this.promptForDateStep.bind(this),
        //     this.endCropDialog.bind(this)
        // ]));
        // this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT));
        // this.addDialog(new ChoicePrompt(SELECTION_PROMPT));
        // this.addDialog(new DateTimePrompt(DATE_PROMPT, this.dateValidator));

        this.UserDataCropAccessor = UserDataCropAccessor;
    }
    async endDiseaseDialog(step) {
        console.log(DISEASE_DIALOG+ " initializeStateStep");

        let userData = await this.UserDataCropAccessor.get(step.context);
        console.log("userData",userData);

        return await step.endDialog();
    }

}

exports.DiseasesDialog = DiseasesDialog;
