"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApplicationInviteSchema = exports.createApplicationInviteSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createApplicationInviteSchema = joi_1.default.object({
    scheduleDate: joi_1.default.date().optional(),
    response: joi_1.default.string().valid('PENDING', 'ACCEPTED', 'REJECTED', 'RESCHEDULED').default('PENDING'),
    propertiesId: joi_1.default.string().optional(),
    userInvitedId: joi_1.default.string().required(),
    apartmentsId: joi_1.default.string().uuid().optional(),
    tenantId: joi_1.default.string().uuid().optional()
});
exports.updateApplicationInviteSchema = joi_1.default.object({
    scheduleDate: joi_1.default.date().optional(),
    response: joi_1.default.string().valid('PENDING', 'ACCEPTED', 'DECLINED', 'RESCHEDULED').optional(),
});
