const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, DateTimePrompt } = require('botbuilder-dialogs');
const { ActionTypes, ActivityTypes, CardFactory } = require('botbuilder');

const { AnswersData } = require('../../data/answersData');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
// Dialog IDs 
const CROP_DIALOG = 'profileDialog';

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
        let userData = await this.UserDataCropAccessor.get(step.context);

        console.log("constructor of DiseasesDialog", userData);

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

}

exports.DiseasesDialog = DiseasesDialog;
