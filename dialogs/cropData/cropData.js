const { ComponentDialog, WaterfallDialog, AttachmentPrompt } = require('botbuilder-dialogs');

const { UserDataCrop } = require('./userDataCrop');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
// Dialog IDs 
const CROP_DIALOG = 'profileDialog';

// Prompt IDs
const ATTACHMENT_PROMPT = 'attachmentPrompt';
const VARIETY_PROMPT = 'cityPrompt';

class CropData extends ComponentDialog {
    constructor(dialogId, UserDataCropAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!UserDataCropAccessor) throw ('Missing parameter.  UserDataCropAccessor is required');

        console.log("constructor of CropData");

        this.addDialog(new WaterfallDialog(CROP_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForAttachmentStep.bind(this),
            this.promptForCropStep.bind(this),
            this.handleCropData.bind(this)
        ]));
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT));
        this.UserDataCropAccessor = UserDataCropAccessor;
    }

    async initializeStateStep(step) {
        console.log("initializeStateStep");

        let userData = await this.UserDataCropAccessor.get(step.context);
        if (userData === undefined) {
            await this.UserDataCropAccessor.set(step.context, new UserDataCrop());
        }
        return await step.next();
    }

    async promptForAttachmentStep(step) {
        console.log('promptForAttachmentStep');

        //console.log("step", step);
        //const userDataCrop = await this.UserDataCropAccessor.get(step.context);
        if (step.context.activity.attachments && step.context.activity.attachments.length > 0) {
            console.log('there is attachment');

            // The user sent an attachment and the bot should handle the incoming attachment.
            return await step.next();
        } else {
            // Since no attachment was received, send an attachment to the user.
            return await step.prompt(ATTACHMENT_PROMPT, {
                prompt: 'Please upload crop image',
                retryPrompt: 'You didn\'t upload any attachment, please upload crop image.'
            });
        }
    }
    async promptForCropStep(step) {
        console.log('promptForCropStep');
        if (step.context.activity.attachments && step.context.activity.attachments.length > 0) {
            console.log('_handleIncomingAttachment');

            await this._handleIncomingAttachment(step.context);
        }

        const userDataCrop = await this.UserDataCropAccessor.get(step.context);
        console.log('userDataCrop', userDataCrop);

        if (!userDataCrop || userDataCrop.crop == undefined) {

            let option = await displayCropOptions(step.context);
            console.log('option', option);

            if (option)
                return await step.next();
        } else {
            return await step.next();
        }
    }
    async handleCropData(step) {
        console.log('handleCropData');
        var turnContext = step.context;
        const userDataCrop = await this.UserDataCropAccessor.get(turnContext)
        const reply = { type: ActivityTypes.Message };

        const cropList = [{ id: 1, name: 'tomato' }, { id: 2, name: 'banana' }]
        const text = turnContext.activity.text;
        let idCrop = cropList.find(x => x.id == userDataCrop.crop.id);
        console.log("idCrop", idCrop);
        /* if (idCrop == undefined)
             return await displayCropOptions(turnContext);
         if (idCrop != undefined)
             step.endDialog();
         else
             await dc.beginDialog(promptForCropStep);*/
        //return await step.();  
        step.endDialog();

    }

    async displayCropOptions(turnContext) {
        console.log('displayCropOptions');
        const cropList = [{ id: 1, name: 'tomato' }, { id: 2, name: 'banana' }]
        const reply = { type: ActivityTypes.Message };

        let buttons = cropList.map((crop) => {
            return { type: ActionTypes.ImBack, title: `${crop.id}.${crop.name}`, value: crop.id };
        });

        const card = CardFactory.heroCard('', undefined,
            buttons, { text: 'You select one of the following choices.' });

        reply.attachments = [card];
        console.log('send card');

        await turnContext.sendActivity(reply);
    }


    async _handleIncomingAttachment(turnContext) {
        const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite);
        const successfulSaves = await Promise.all(promises);

        async function replyForReceivedAttachments(localAttachmentData) {
            if (localAttachmentData) {
                await this.sendActivity(`Attachment "${localAttachmentData.fileName}" ` +
                    `has been received and saved to "${localAttachmentData.localPath}".`);
            } else {
                await this.sendActivity('Attachment was not successfully saved to disk.');
            }
        }

        const replyPromises = successfulSaves.map(replyForReceivedAttachments.bind(turnContext));
        await Promise.all(replyPromises);
    }
    /**
       * Downloads attachment to the disk.
       * @param {Object} attachment
       */
    async downloadAttachmentAndWrite(attachment) {
        // Retrieve the attachment via the attachment's contentUrl.
        const url = attachment.contentUrl;

        // Local file path for the bot to save the attachment.
        const localFileName = path.join(__dirname, "attachments", attachment.name);

        try {
            const response = await axios.get(url);
            fs.writeFile(localFileName, response.data, (fsError) => {
                if (fsError) {
                    throw fsError;
                }
            });
        } catch (error) {
            console.error(error);
            return undefined;
        }
        // If no error was thrown while writing to disk, return the attachment's name
        // and localFilePath for the response back to the user.
        return {
            fileName: attachment.name,
            localPath: localFileName
        };
    }

}

exports.CropDataDialog = CropData;
