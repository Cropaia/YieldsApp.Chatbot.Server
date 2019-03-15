const { ComponentDialog, WaterfallDialog, AttachmentPrompt, ChoicePrompt, DateTimePrompt } = require('botbuilder-dialogs');

const { AnswersData } = require('../../data/answersData');
const path = require('path');
const request = require('request');
const appRoot = require('app-root-path');
const fs = require('fs');

// Dialog IDs 
const CROP_DIALOG = 'profileDialog';

// Prompt IDs
const ATTACHMENT_PROMPT = 'attachmentPrompt';
const SELECTION_PROMPT = 'selectionPrompt', 
    DONE_OPTION="Done", 
    NEXT_QUESTION_DIALOG = 'nextQuestionDialog',
    LOCATION_TYPE_SELECTION = 'locationTypes';
const DATE_PROMPT = 'datePrompt';

const cropList = require('./../../data/crop.json');

const locationTypeList = [{ id: 1, name: 'leaves' }, { id: 2, name: 'stem' }, { id: 3, name: 'fruits' }, { id: 4, name: 'root' }]
class CropDialog extends ComponentDialog {
    constructor(dialogId, UserDataCropAccessor) {
        super(dialogId);
        // validate what was passed in
        if (!dialogId) throw ('Missing parameter.  dialogId is required');
        if (!UserDataCropAccessor) throw ('Missing parameter.  UserDataCropAccessor is required');

        console.log("constructor of CropDialog");

        this.addDialog(new WaterfallDialog(CROP_DIALOG, [
            this.initializeStateStep.bind(this),
            this.promptForAttachmentStep.bind(this),
            this.promptForCropStep.bind(this),
            this.promptForDateStep.bind(this),
            this.promptNextQuestion.bind(this),
            this.endCropDialog.bind(this)
        ]));
        this.dialogs.add(new WaterfallDialog(NEXT_QUESTION_DIALOG)
        .addStep(this.selectionStep.bind(this))
        .addStep(this.loopStep.bind(this)));

        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT));
        this.addDialog(new ChoicePrompt(SELECTION_PROMPT));
        this.addDialog(new DateTimePrompt(DATE_PROMPT, this.dateValidator, "he-il"));
        
        this.UserDataCropAccessor = UserDataCropAccessor;
    }

    async initializeStateStep(step) {
        let userData = await this.UserDataCropAccessor.get(step.context);
        if (userData === undefined) {
            await this.UserDataCropAccessor.set(step.context, new AnswersData());
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
        const userDataCrop = await this.UserDataCropAccessor.get(step.context);

        if (step.context.activity.attachments && step.context.activity.attachments.length > 0) {
            console.log('_handleIncomingAttachment');

            await this._handleIncomingAttachment(step.context, userDataCrop);
        }

        console.log('userDataCrop', userDataCrop);

        if (!userDataCrop || userDataCrop.crop == undefined) {
            let list = cropList.map((crop) => {
                // var object = {};
                //object[crop.name] = crop;
                return crop.name;
            });
            console.log('list', list);

            // await this.displayCropOptions(step.context);
            return await step.prompt(SELECTION_PROMPT, {
                prompt: 'select crop:',
                retryPrompt: 'Please choose an option from the list.',
                choices: list
            });
        } else {
            return await step.next();
        }
    }
    async promptForDateStep(step) {
        const userDataCrop = await this.UserDataCropAccessor.get(step.context)
        if (userDataCrop.crop == undefined && step.result) {
            const text = step.result.value;
            let crop = cropList.find(x => x.name == text);
            userDataCrop.crop = crop;
        }

        if (userDataCrop.plantingDate == undefined) {
            return await step.prompt(DATE_PROMPT, 'please enter planting date');
        } else {
            return await step.next();
        }
    }

    async promptForlocationTypeStep(step) {
        const userDataCrop = await this.UserDataCropAccessor.get(step.context)
        if (userDataCrop.plantingDate == undefined && step.result && step.result.length > 0) {
            userDataCrop.plantingDate = step.result[0].value;
        }
        if (userDataCrop.locationTypes.length < 4) {
            if (userDataCrop.locationTypes.length == 0) {

                let list = locationTypeList.map((crop) => {
                    return crop.name;
                });
            }
            return await step.prompt(SELECTION_PROMPT, {
                prompt: 'select locationType:',
                retryPrompt: 'Please choose an option from the list.',
                choices: list
            });
        } else {
          
                return await step.next();
        }
    }
    async selectionStep(step) {
        // Continue using the same selection list, if any, from the previous iteration of this dialog.
        const list = Array.isArray(step.options) ? step.options : [];
        step.values[LOCATION_TYPE_SELECTION] = list;
    
        // Create a prompt message.
        let message;
        if (list.length === 0) {
            message = 'Please choose a location to review, or `' + DONE_OPTION + '` to finish.';
        } else {
            message = `You have selected **${list[list.length-1]}**. You can review an addition location, ` +
                'or choose `' + DONE_OPTION + '` to finish.';
        }
    
        // Create the list of options to choose from.
        const options = list.length > 0
            ? locationTypeList.filter(function (item) { return item !== list[0] }).map(item => item.name)
            : locationTypeList.slice().map(item => item.name);
        options.push(DONE_OPTION);
    
        // Prompt the user for a choice.
        return await step.prompt(SELECTION_PROMPT, {
            prompt: message,
            retryPrompt: 'Please choose an option from the list.',
            choices: options
        });
    }
    
    async loopStep(step) {
        // Retrieve their selection list, the choice they made, and whether they chose to finish.
        const list = step.values[LOCATION_TYPE_SELECTION];
        const choice = step.result;
        const done = choice.value === DONE_OPTION;
    
        if (!done) {
            // If they chose a company, add it to the list.
            list.push(choice.value);
        }
    
        if (done || list.length >= locationTypeList.length) {
            const userDataCrop = await this.UserDataCropAccessor.get(step.context)
            if (userDataCrop.locationTypes.length == 0 && list) {
                userDataCrop.locationTypes = list;
            }
            // If they're done, exit and return their list.
            return await step.endDialog(list);
        } else {
            // Otherwise, repeat this dialog, passing in the list from this iteration.
            return await step.replaceDialog(NEXT_QUESTION_DIALOG, list);
        }
    }

    async endCropDialog(step) {
        const userDataCrop = await this.UserDataCropAccessor.get(step.context)
        if (userDataCrop.locationTypes.length == 0 && step.result) {
            const text = step.result.value;
            const locationType = locationTypeList.find(x => x.name == text);
            userDataCrop.locationTypes.push(locationType);
        }

        await step.context.sendActivity('Thank you for your time.');
        return await step.endDialog();
    }


    async _handleIncomingAttachment(turnContext,userDataCrop) {
        const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite.bind(this));
        const successfulSaves = await Promise.all(promises);

        async function replyForReceivedAttachments(localAttachmentData) {
            if (localAttachmentData) {
                userDataCrop.pictures.push(localAttachmentData);
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
        // Local file path for the bot to save the attachment.
        const localFileName = path.join(appRoot.path, "attachments", attachment.name);

        try {
            request(attachment.contentUrl).pipe(fs.createWriteStream(localFileName));
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


    async dateValidator(promptContext) {
        // Check whether the input could be recognized as an integer.
        if (!promptContext.recognized.succeeded) {
            await promptContext.context.sendActivity(
                "I'm sorry, I do not understand. Please enter the date or time for your planting date.");
            return false;
        }

        // Check whether any of the recognized date-times are appropriate,
        // and if so, return the first appropriate date-time.
        const earliest = Date.now();
        let value = null;
        promptContext.recognized.value.forEach(candidate => {
            // TODO: update validation to account for time vs date vs date-time vs range.
            const time = new Date(candidate.value || candidate.start);
            if (time.getTime() < earliest) {
                value = candidate;
            }
        });
        if (value) {
            promptContext.recognized.value = [value];
            return true;
        }

        await promptContext.context.sendActivity(
            "I'm sorry, we can't take date later than now.");
        return false;
    }

    async promptNextQuestion(step) {
        const answersData = await this.UserDataCropAccessor.get(step.context);
        console.log(answersData.diseasesData);

        // getQuestionValue
        // filterAndScoreByField(field, answer);

        // orderDiseases();
        // const question = this._getNextQuestion();

        return await step.beginDialog(NEXT_QUESTION_DIALOG);
    }


}

exports.CropDialog = CropDialog;
