const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');

const { UserDataCrop } = require('./userDataCrop');

// Dialog IDs 
const CROP_DIALOG = 'profileDialog';

// Prompt IDs
const CROP_PROMPT = 'namePrompt';
const VARIETY_PROMPT = 'cityPrompt';

class CropData extends ComponentDialog {
    constructor(dialogId, UserDataCropAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!UserDataCropAccessor) throw ('Missing parameter.  UserDataCropAccessor is required');

        this.addDialog(new WaterfallDialog(CROP_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForAttachmentStep.bind(this)//,
            //this.promptForCityStep.bind(this),
            //this.displayCropDataStep.bind(this)
        ]));

        this.UserDataCropAccessor = UserDataCropAccessor;
    }

    async initializeStateStep(step) {
        let userData = await this.UserDataCropAccessor.get(step.context);
        if (userData === undefined) {
            await this.UserDataCropAccessor.set(step.context, new UserDataCrop());
        }
        return await step.next();
    }

    async promptForAttachmentStep(step) {
        //const userDataCrop = await this.UserDataCropAccessor.get(step.context);
        if (step.context.activity.attachments && step.context.activity.attachments.length > 0) {
            // The user sent an attachment and the bot should handle the incoming attachment.
            await this.handleIncomingAttachment(step.context);
            return await step.next();
        } else {
            // Since no attachment was received, send an attachment to the user.
            await step.context.sendActivity('you didn\'t upload any attachment, please upload crop image');              
        }
    }


    async handleIncomingAttachment(turnContext) {
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


}

exports.CropDataDialog = CropData;
