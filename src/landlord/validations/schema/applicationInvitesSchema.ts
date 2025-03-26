import Joi from 'joi';
import { InvitedResponse, YesNo} from "@prisma/client"
const invitedResponseType = Object.values(InvitedResponse);
const YesNoType = Object.values(YesNo);

export const createApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().iso().optional(),
  response: Joi.string().valid(...invitedResponseType).default(InvitedResponse.PENDING).optional(),
  propertiesId: Joi.string().optional(),
  userInvitedId: Joi.string().required(),
  apartmentsId: Joi.string().uuid().optional(),
  tenantId: Joi.string().uuid().optional()
});

export const updateApplicationInviteSchema = Joi.object({
  reScheduleDate: Joi.date().iso().optional(),
  scheduleDate: Joi.date().iso().optional(),
  enquiryId: Joi.string().optional(),
  applicationFee: Joi.string().valid(...YesNoType).optional(),
  response: Joi.string().valid(...invitedResponseType).optional(),
});
