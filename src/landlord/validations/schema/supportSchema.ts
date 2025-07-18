import Joi from 'joi';
import {TicketPriority} from "@prisma/client"

export const CreateSupportTicketSchema = Joi.object({
    subject: Joi.string().min(3).max(200).required().messages({
        'string.base': 'Subject must be a text',
        'string.empty': 'Subject is required',
        'string.min': 'Subject must be at least 3 characters',
        'any.required': 'Subject is required',
    }),

    type: Joi.string()
        .valid('SUPPORT', 'SUGGESTION')
        .required()
        .messages({
            'any.only': 'Type must be either SUPPORT or SUGGESTION',
            'any.required': 'Type is required',
        }),

    description: Joi.string().min(10).required().messages({
        'string.min': 'Description must be at least 10 characters',
        'any.required': 'Description is required',
    }),

    priority: Joi.string()
        .valid(...Object.values(TicketPriority))
        .default('PENDING')
        .messages({
            'any.only': 'Priority must be HIGH, MEDIUM, LOW or PENDING',
        }),

    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
});

export const UpdateSupportTicketSchema = Joi.object({
  subject: Joi.string().min(3).max(200).optional(),
  type: Joi.string().valid('SUPPORT', 'SUGGESTION').optional(),
  description: Joi.string().min(10).optional(),
  priority: Joi.string()
    .valid(...Object.values(TicketPriority))
    .optional(),

  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
});


export const UpdateSupportTicketStatusSchema = Joi.object({
    status: Joi.string()
        .valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
        .required()
        .messages({
            'any.only': 'Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED',
            'any.required': 'Status is required',
        }),
});

export const AssignSupportTicketSchema = Joi.object({
    assignedToId: Joi.string().required().messages({
        'string.base': 'AssignedToId must be a string',
        'any.required': 'AssignedToId is required',
    }),
});
