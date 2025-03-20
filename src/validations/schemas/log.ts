import Joi from 'joi';
import { LogType, YesNo } from "@prisma/client"
const logsType = Object.values(LogType);
const yesNoType = Object.values(YesNo);


export const logSchema = Joi.object({
  id: Joi.string().optional(), // Automatically generated, so optional
  applicationInvitedId: Joi.string().required(), 
  subjects: Joi.string().optional().allow(''), // Optional field
  viewAgain: Joi.string().optional().allow('').valid(...yesNoType), // Optional field
  considerRenting: Joi.string().optional().allow('').valid(...yesNoType), // Optional field
  events: Joi.string().required(), // Required field
  type: Joi.string().valid(...logsType).default(LogType.APPLICATION).optional(),
  propertyId: Joi.string().optional().allow(''), // Optional field
  applicationId: Joi.string().optional().allow(''), // Optional field
  transactionId: Joi.string().optional().allow(''), // Optional field
});



