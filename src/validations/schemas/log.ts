import Joi from 'joi';
import { LogType, YesNo, InvitedResponse } from "@prisma/client"
import { stringJoiOptional, stringJoiRequired } from './base.schema';
const logsType = Object.values(LogType);
const yesNoType = Object.values(YesNo);
const InvitedResponseType = Object.values(InvitedResponse);

export const logSchema = Joi.object({
  id: stringJoiOptional,
  response: Joi.string().valid(...InvitedResponseType).optional(),
  applicationInvitedId: stringJoiRequired,
  subjects: stringJoiOptional,
  viewAgain: Joi.string().optional().allow('').valid(...yesNoType),
  considerRenting: Joi.string().optional().allow('').valid(...yesNoType),
  events: stringJoiRequired,
  type: Joi.string().valid(...logsType).default(LogType.APPLICATION).optional(),
  propertyId: stringJoiOptional,
  applicationId: stringJoiOptional,
  transactionId: stringJoiOptional,
}).custom((value, helpers) => {
  // Check required response if either field exists
  if ((value.viewAgain || value.considerRenting) && !value.response) {
    return helpers.error('any.required', {
      message: 'Response is required when providing viewAgain or considerRenting'
    });
  }

  return value;
});