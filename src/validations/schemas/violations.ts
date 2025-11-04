import Joi from 'joi';
import { SeverityLevel, ResponseType, DeliveryMethod, NoticeType } from "@prisma/client";

const severityLevels = Object.values(SeverityLevel);
const noticeType = Object.values(NoticeType);
const deliveryMethod = Object.values(DeliveryMethod);
const responsesTypes = Object.values(ResponseType);

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


export const ViolationResponseSchema = Joi.object({
    violationId: Joi.string().required().messages({
        "any.required": "violationId is required",
        "string.base": "violationId must be a string",
    }),
    responseType: Joi.string()
        .valid(...responsesTypes)
        .required()
        .messages({
            "any.only": `responseType must be one of: ${responsesTypes.join(", ")}`,
            "any.required": "responseType is required",
        }),
    paymentAmount: Joi.number().positive().precision(2).optional(),
    paymentDate: Joi.date().optional(),
    paymentMethod: Joi.string().max(100).optional(),
    reasonForDispute: Joi.string().max(500).optional(),
    evidenceUrl: Joi.string().uri().optional(),
    additionalComment: Joi.string().max(1000).optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
});

