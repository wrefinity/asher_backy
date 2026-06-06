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
  proposedViewingDate: Joi.alternatives()
    .try(Joi.date().iso(), Joi.string().isoDate())
    .optional()
    .allow(null, ''),
  events: Joi.string().optional().allow(''),
  type: Joi.string().valid(...logsType).optional(),
  propertyId: stringJoiOptional,
  applicationId: stringJoiOptional,
  transactionId: stringJoiOptional,
}).custom((value, helpers) => {
  if ((value.viewAgain || value.considerRenting) && !value.response) {
    return helpers.error('any.required', {
      message: 'Response is required when providing viewAgain or considerRenting'
    });
  }

  if (value.viewAgain === 'YES' && !value.proposedViewingDate) {
    return helpers.error('any.required', {
      message: 'Proposed viewing date is required when requesting a re-visit'
    });
  }

  const hasEvents = Boolean(value.events?.trim());
  const hasRentingAnswer = Boolean(value.considerRenting);
  const isRevisit = value.viewAgain === 'YES';

  if (!hasEvents && !hasRentingAnswer && !isRevisit) {
    return helpers.error('any.required', {
      message: 'Please provide feedback or select an option'
    });
  }

  return value;
});
