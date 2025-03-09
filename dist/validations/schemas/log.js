"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackSchema = exports.logSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const logsType = Object.values(client_1.LogType);
exports.logSchema = joi_1.default.object({
    id: joi_1.default.string().optional(), // Automatically generated, so optional
    subjects: joi_1.default.string().optional().allow(''), // Optional field
    events: joi_1.default.string().required(), // Required field
    type: joi_1.default.string().valid(...logsType).default(client_1.LogType.APPLICATION).optional(),
    propertyId: joi_1.default.string().optional().allow(''), // Optional field
    applicationId: joi_1.default.string().optional().allow(''), // Optional field
    transactionId: joi_1.default.string().optional().allow(''), // Optional field
});
// Joi schema for Feedback
exports.feedbackSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    comment: joi_1.default.string().required(),
    createdAt: joi_1.default.date().optional(),
    logId: joi_1.default.string().required(),
});
