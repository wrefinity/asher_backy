import Joi from 'joi';
import { InvitedResponse} from "@prisma/client"
const invitedResponseType = Object.values(InvitedResponse);

export const createApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().optional(),
  response: Joi.string().valid(...invitedResponseType).default(InvitedResponse.PENDING).required(),
  propertiesId: Joi.string().optional(),
  userInvitedId: Joi.string().required(),
  apartmentsId: Joi.string().uuid().optional(),
  tenantId: Joi.string().uuid().optional()
});

export const updateApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().iso().optional(),
  response: Joi.string().valid(...invitedResponseType).optional(),
});
