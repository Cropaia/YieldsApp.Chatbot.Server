const _ = require('lodash');
const  { DiseasesData } = require('./diseasesData');

const OPERATOR = {
    OR: "or",
    AND: "and"
}


class DiseasesCondition {
    constructor(disease, diseaseScoreData, diseasesData) {
        this.disease = disease;
        this.diseaseScoreData = diseaseScoreData;
        this.diseasesData = diseasesData;
    }

    checkConditions(conditions, operator = OPERATOR.AND) {
        let loopStrategy;
        switch (operator) {
            case OPERATOR.AND:
                loopStrategy = _.every;
                break;
            case OPERATOR.OR:
                loopStrategy = _.some;
                break;
            default:
                loopStrategy = _.every;
                break;
        }

        return loopStrategy(conditions, (condition) => {
            const operator = this._getOperator(condition);
            if (operator)
                return this.checkConditions(condition.conditions, operator);
            return this._isConditionCorrect(condition);
        });
    }

    _isConditionCorrect(condition) {
        let fieldValue = DiseasesData.findFieldValue(condition.field, this.disease, this.diseasesData);


        switch (condition.operation) {
            case '<':
                return fieldValue < condition.value;
            case '>':
                return fieldValue > condition.value;
            case '=':
                return fieldValue == condition.value;
            case '!=':
                return fieldValue != condition.value;
            case '<=':
                return fieldValue <= condition.value;
            case '>=':
                return fieldValue >= condition.value;
            case '':
                return true;
            default:
                return false;
        }
    }

    _getOperator(conditon) {
        if (!conditon.operator) return null;
        const operator = _.toUpper(conditon.operator);
        if (OPERATOR.hasOwnProperty(operator)) {
            if (!conditon.conditions)
                throw new Error("error at conditon this conditon with operator dont have conditions property");
            return operator;
        }

        return null;
    }
}

exports.DiseasesCondition = DiseasesCondition;
