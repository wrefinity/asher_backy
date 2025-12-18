import Joi from 'joi';
import { LogType, YesNo, InvitedResponse } from "@prisma/client"
const logsType = Object.values(LogType);
const yesNoType = Object.values(YesNo);
const InvitedResponseType = Object.values(InvitedResponse);

export const logSchema = Joi.object({
  id: Joi.string().optional(),
  response: Joi.string().valid(...InvitedResponseType).optional(),
  applicationInvitedId: Joi.string().required(),
  subjects: Joi.string().optional().allow(''),
  viewAgain: Joi.string().optional().allow('').valid(...yesNoType),
  considerRenting: Joi.string().optional().allow('').valid(...yesNoType),
  events: Joi.string().required(),
  type: Joi.string().valid(...logsType).default(LogType.APPLICATION).optional(),
  propertyId: Joi.string().optional().allow(''),
  applicationId: Joi.string().optional().allow(''),
  transactionId: Joi.string().optional().allow(''),
}).custom((value, helpers) => {
  // Check required response if either field exists
  if ((value.viewAgain || value.considerRenting) && !value.response) {
    return helpers.error('any.required', {
      message: 'Response is required when providing viewAgain or considerRenting'
    });
  }

  return value;
});

//cm8iz07wk000111s0iiku1vi6


