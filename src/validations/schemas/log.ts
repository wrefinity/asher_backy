import Joi from 'joi';
import { LogType } from "@prisma/client"
const logsType = Object.values(LogType);


export const logSchema = Joi.object({
  id: Joi.string().optional(), // Automatically generated, so optional
  subjects: Joi.string().optional().allow(''), // Optional field
  events: Joi.string().required(), // Required field
  type: Joi.string().valid(...logsType).default(LogType.APPLICATION).optional(),
  propertyId: Joi.string().optional().allow(''), // Optional field
  applicationId: Joi.string().optional().allow(''), // Optional field
  transactionId: Joi.string().optional().allow(''), // Optional field
});


// Joi schema for Feedback
export const feedbackSchema = Joi.object({
  id: Joi.string().optional(),
  comment: Joi.string().required(),
  createdAt: Joi.date().optional(),
  logId: Joi.string().required(),
});
