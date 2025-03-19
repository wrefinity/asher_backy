"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApplicationInviteSchema = exports.createApplicationInviteSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const invitedResponseType = Object.values(client_1.InvitedResponse);
exports.createApplicationInviteSchema = joi_1.default.object({
    scheduleDate: joi_1.default.date().optional(),
    response: joi_1.default.string().valid(...invitedResponseType).default(client_1.InvitedResponse.PENDING).optional(),
    propertiesId: joi_1.default.string().optional(),
    userInvitedId: joi_1.default.string().required(),
    apartmentsId: joi_1.default.string().uuid().optional(),
    tenantId: joi_1.default.string().uuid().optional()
});
exports.updateApplicationInviteSchema = joi_1.default.object({
    scheduleDate: joi_1.default.date().iso().optional(),
    response: joi_1.default.string().valid(...invitedResponseType).optional(),
});
