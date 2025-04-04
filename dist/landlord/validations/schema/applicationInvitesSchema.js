"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationReminderSchema = exports.ReminderType = exports.updateApplicationStatusSchema = exports.updateApplicationInviteSchema = exports.createApplicationInviteSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const invitedResponseType = Object.values(client_1.InvitedResponse);
const YesNoType = Object.values(client_1.YesNo);
const ApplicationStatusType = Object.values(client_1.ApplicationStatus);
exports.createApplicationInviteSchema = joi_1.default.object({
    scheduleDate: joi_1.default.date().iso().optional(),
    response: joi_1.default.string().valid(...invitedResponseType).default(client_1.InvitedResponse.PENDING).optional(),
    propertiesId: joi_1.default.string().optional(),
    userInvitedId: joi_1.default.string().required(),
    apartmentsId: joi_1.default.string().uuid().optional(),
    tenantId: joi_1.default.string().uuid().optional()
});
exports.updateApplicationInviteSchema = joi_1.default.object({
    reScheduleDate: joi_1.default.date().when('response', {
        is: client_1.InvitedResponse.RESCHEDULED_ACCEPTED,
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    }),
    scheduleDate: joi_1.default.date().iso().optional(),
    enquiryId: joi_1.default.string().optional(),
    applicationFee: joi_1.default.string().valid(...YesNoType).optional(),
    response: joi_1.default.string().valid(...invitedResponseType).optional(),
});
exports.updateApplicationStatusSchema = joi_1.default.object({
    status: joi_1.default.string().valid(...ApplicationStatusType).required(),
});
var ReminderType;
(function (ReminderType) {
    ReminderType["REFERENCE_REMINDER"] = "REFERENCE_REMINDER";
    ReminderType["SCHEDULE_REMINDER"] = "SCHEDULE_REMINDER";
    ReminderType["APPLICATION_REMINDER"] = "APPLICATION_REMINDER";
})(ReminderType || (exports.ReminderType = ReminderType = {}));
exports.applicationReminderSchema = joi_1.default.object({
    status: joi_1.default.string().valid(...Object.values(ReminderType)).required(),
});
