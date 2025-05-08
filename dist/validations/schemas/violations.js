"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
// Get the list of severity levels from the Prisma `SeverityLevel` enum
const severityLevels = Object.values(client_1.SeverityLevel);
const noticeType = Object.values(client_1.NoticeType);
const deliveryMethod = Object.values(client_1.DeliveryMethod);
// Joi Schema for Violation
exports.ViolationSchema = joi_1.default.object({
    description: joi_1.default.string()
        .min(10)
        .max(500)
        .required()
        .messages({
        'string.base': 'Description must be a string',
        'string.min': 'Description should have a minimum length of 10 characters',
        'string.max': 'Description should have a maximum length of 500 characters',
        'any.required': 'Description is required'
    }),
    severityLevel: joi_1.default.string()
        .valid(...severityLevels) // Validation for predefined severity levels
        .default(client_1.SeverityLevel.LOW) // Default to 'MODERATE' if not provided
        .messages({
        'any.only': `Severity level must be one of: ${severityLevels.join(', ')}`,
        'string.base': 'Severity level must be a string',
    }),
    deliveryMethod: joi_1.default.string()
        .valid(...deliveryMethod)
        .messages({
        'any.only': `Delivery method must be one of: ${deliveryMethod.join(', ')}`,
        'string.base': 'Deliery method must be a string',
    }),
    dueDate: joi_1.default.date().optional(),
    noticeType: joi_1.default.string()
        .valid(...noticeType)
        .messages({
        'any.only': `Notice type must be one of: ${noticeType.join(', ')}`,
        'string.base': 'Notice type must be a string',
    }),
    actionTaken: joi_1.default.string()
        .optional()
        .max(300)
        .messages({
        'string.base': 'Action taken must be a string',
        'string.max': 'Action taken should have a maximum length of 300 characters',
    }),
    tenantId: joi_1.default.string()
        .required()
        .messages({
        'string.base': 'Tenant ID must be a string',
        'any.required': 'Tenant ID is required',
    }),
    propertyId: joi_1.default.string()
        .optional()
        .messages({
        'string.base': 'Property ID must be a string',
    }),
    unitId: joi_1.default.string()
        .optional()
        .messages({
        'string.base': 'Property ID must be a string',
    }),
});
