import Joi from 'joi';
import { SeverityLevel, DeliveryMethod, NoticeType } from "@prisma/client";

// Get the list of severity levels from the Prisma `SeverityLevel` enum
const severityLevels = Object.values(SeverityLevel);
const noticeType = Object.values(NoticeType);
const deliveryMethod = Object.values(DeliveryMethod);

// Joi Schema for Violation
export const ViolationSchema = Joi.object({
    description: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.base': 'Description must be a string',
            'string.min': 'Description should have a minimum length of 10 characters',
            'string.max': 'Description should have a maximum length of 500 characters',
            'any.required': 'Description is required'
        }),
    severityLevel: Joi.string()
        .valid(...severityLevels) // Validation for predefined severity levels
        .default(SeverityLevel.LOW)  // Default to 'MODERATE' if not provided
        .messages({
            'any.only': `Severity level must be one of: ${severityLevels.join(', ')}`,
            'string.base': 'Severity level must be a string',
        }),
    deliveryMethod: Joi.string()
        .valid(...deliveryMethod)
        .messages({
            'any.only': `Delivery method must be one of: ${deliveryMethod.join(', ')}`,
            'string.base': 'Deliery method must be a string',
        }),
    dueDate: Joi.date().optional(),
    noticeType: Joi.string()
        .valid(...noticeType)
        .messages({
            'any.only': `Notice type must be one of: ${noticeType.join(', ')}`,
            'string.base': 'Notice type must be a string',
        }),
    actionTaken: Joi.string()
        .optional()
        .max(300)
        .messages({
            'string.base': 'Action taken must be a string',
            'string.max': 'Action taken should have a maximum length of 300 characters',
        }),

    tenantId: Joi.string()
        .required()
        .messages({
            'string.base': 'Tenant ID must be a string',
            'any.required': 'Tenant ID is required',
        }),

    propertyId: Joi.string()
        .optional()
        .messages({
            'string.base': 'Property ID must be a string',
        }),
    unitId: Joi.string()
        .optional()
        .messages({
            'string.base': 'Property ID must be a string',
        }),
});
