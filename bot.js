const { ActivityTypes } = require('botbuilder');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_CROP_DATA_PROPERTY = 'userCropDataProperty';

const CROPDATA_DIALOG = 'cropdataDialog';

const { UserDataCrop } = require('./dialogs/cropData/userDataCrop');
const { CropDataDialog } = require('./dialogs/cropData/cropData');

class Bot {

    constructor(conversationState, userState) {
        this.conversationState = conversationState;

        this.userCropDataAccessor = userState.createProperty(USER_CROP_DATA_PROPERTY);
        this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.dialogs = new DialogSet(this.dialogState);
        this.dialogs.add(new CropDataDialog(CROPDATA_DIALOG, this.userCropDataAccessor));
    }

    async onTurn(turnContext) {
        if (turnContext.activity.type === ActivityTypes.Message) {
            let dialogResult;
            const dc = await this.dialogs.createContext(turnContext);

            if (dc.activeDialog)
                dialogResult = await dc.continueDialog();
            if (!dc.context.responded) {
                switch (dialogResult.status) {
                    case DialogTurnStatus.empty:
                        await dc.beginDialog(CROPDATA_DIALOG);
                        break;
                    case DialogTurnStatus.waiting:
                        break;
                    case DialogTurnStatus.complete:
                        break;
                    default:
                        await dc.cancelAllDialogs();
                        break;
                }
            }

        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate &&
            turnContext.activity.recipient.id === turnContext.activity.membersAdded[0].id && turnContext.activity.recipient.name === turnContext.activity.membersAdded[0].name) {
            // If the Activity is a ConversationUpdate, send a greeting message to the user.
            await turnContext.sendActivity('Welcome to the identification module! please upload image of the crop');
        } else {
            // Generic handler for all other activity types.
            await turnContext.sendActivity(`[${turnContext.activity.type} event detected]`);
        }

        await this.conversationState.saveChanges(turnContext);
        await this.userState.saveChanges(turnContext);
    }
}

exports.Bot = Bot;
