"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const logsType = Object.values(client_1.LogType);
const yesNoType = Object.values(client_1.YesNo);
const InvitedResponseType = Object.values(client_1.InvitedResponse);
exports.logSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    response: joi_1.default.string().valid(...InvitedResponseType).optional(),
    applicationInvitedId: joi_1.default.string().required(),
    subjects: joi_1.default.string().optional().allow(''),
    viewAgain: joi_1.default.string().optional().allow('').valid(...yesNoType),
    considerRenting: joi_1.default.string().optional().allow('').valid(...yesNoType),
    events: joi_1.default.string().required(),
    type: joi_1.default.string().valid(...logsType).default(client_1.LogType.APPLICATION).optional(),
    propertyId: joi_1.default.string().optional().allow(''),
    applicationId: joi_1.default.string().optional().allow(''),
    transactionId: joi_1.default.string().optional().allow(''),
}).custom((value, helpers) => {
    // Check mutual exclusion
    if (value.viewAgain && value.considerRenting) {
        return helpers.error('any.invalid', {
            message: '"viewAgain" and "considerRenting" cannot both be supplied'
        });
    }
    // Check required response if either field exists
    if ((value.viewAgain || value.considerRenting) && !value.response) {
        return helpers.error('any.required', {
            message: 'Response is required when providing viewAgain or considerRenting'
        });
    }
    return value;
});
//cm8iz07wk000111s0iiku1vi6
