const { ActivityTypes } = require('botbuilder');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_CROP_DATA_PROPERTY = 'userCropDataProperty';

const CROP_DIALOG = 'cropdataDialog';
const DISEASES_DIALOG = 'diseasesDialog';

const dialogsList = [CROP_DIALOG, DISEASES_DIALOG];
const { CropDialog } = require('./dialogs/cropDialog');
const { DiseasesDialog } = require('./dialogs/diseasesDialog');

class Bot {

    constructor(conversationState, userState) {
        if (!conversationState) throw new Error('Missing parameter.  conversationState is required');
        if (!userState) throw new Error('Missing parameter.  userState is required');

        this.userCropDataAccessor = conversationState.createProperty(USER_CROP_DATA_PROPERTY);
        this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.dialogs = new DialogSet(this.dialogState);
        this.dialogs.add(new CropDialog(CROP_DIALOG, this.userCropDataAccessor));
        this.dialogs.add(new DiseasesDialog(DISEASES_DIALOG, this.userCropDataAccessor));

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogIndex = 0;
    }

    async onTurn(turnContext) {
        if (turnContext.activity.type === ActivityTypes.Message) {
            let dialogResult;
            const dc = await this.dialogs.createContext(turnContext);
            console.log("1 dc.activeDialog", dc.activeDialog);

            //if (dc.activeDialog){
            dialogResult = await dc.continueDialog();
            console.log("2 continueDialog dialogResult", dialogResult);

            //}
            console.log("3 dc.context.responded", dc.context.responded);

            if (!dc.context.responded) {
                console.log("4 dialogResult.status", dialogResult.status);

                switch (dialogResult.status) {
                    case DialogTurnStatus.empty:
                        console.log("5 beginDialog starting");
                        await this.beginNextDialog(dc);
                        console.log("5 beginDialog end");
                        break;
                    case DialogTurnStatus.waiting:
                        break;
                    case DialogTurnStatus.complete:
                        // console.log("5 beginDialog starting (complete)");
                        // await this.beginNextDialog(dc);
                        // console.log("5  end of beginDialog (complete)");
                        break;
                    default:
                        await dc.cancelAllDialogs();
                        console.log("6 cancelAllDialogs");
                        break;
                }
            } else {
                if (dialogResult.status == DialogTurnStatus.complete) {
                    console.log("7 beginDialog starting (complete)");
                    await this.beginNextDialog(dc);
                    console.log("7  end of beginDialog (complete)");
                }
            }

        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
            turnContext.activity.recipient.id === turnContext.activity.membersAdded[0].id && turnContext.activity.recipient.name === turnContext.activity.membersAdded[0].name) {
            // If the Activity is a ConversationUpdate, send a greeting message to the user.
            await turnContext.sendActivity('Welcome to the identification module! please upload image of the crop');
        } /*else {
            // Generic handler for all other activity types.
            await turnContext.sendActivity(`[${turnContext.activity.type} event detected]`);
        }*/

        await this.conversationState.saveChanges(turnContext);
        await this.userState.saveChanges(turnContext);
    }


    async beginNextDialog(dc) {
        console.log("beginNextDialog", this.dialogIndex, dc.activeDialog, dialogsList[this.dialogIndex])
        if (this.dialogIndex < dialogsList.length)
            await dc.beginDialog(dialogsList[this.dialogIndex++]);
        console.log("beginNextDialog2", this.dialogIndex, dc.activeDialog, dialogsList[this.dialogIndex])

    }
}




exports.Bot = Bot;
