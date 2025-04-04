import Joi from 'joi';
import { InvitedResponse, ApplicationStatus, YesNo} from "@prisma/client"
const invitedResponseType = Object.values(InvitedResponse);
const YesNoType = Object.values(YesNo);
const ApplicationStatusType = Object.values(ApplicationStatus);

export const createApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().iso().optional(),
  response: Joi.string().valid(...invitedResponseType).default(InvitedResponse.PENDING).optional(),
  propertiesId: Joi.string().optional(),
  userInvitedId: Joi.string().required(),
  apartmentsId: Joi.string().uuid().optional(),
  tenantId: Joi.string().uuid().optional()
});

export const updateApplicationInviteSchema = Joi.object({
  reScheduleDate: Joi.date().when('response', {
    is: InvitedResponse.RESCHEDULED_ACCEPTED,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  scheduleDate: Joi.date().iso().optional(),
  enquiryId: Joi.string().optional(),
  applicationFee: Joi.string().valid(...YesNoType).optional(),
  response: Joi.string().valid(...invitedResponseType).optional(),
});
export const updateApplicationStatusSchema = Joi.object({ 
  status: Joi.string().valid(...ApplicationStatusType).required(),
});

export enum ReminderType {
  REFERENCE_REMINDER = "REFERENCE_REMINDER",
  SCHEDULE_REMINDER = "SCHEDULE_REMINDER",
  APPLICATION_REMINDER = "APPLICATION_REMINDER",
}

export const applicationReminderSchema = Joi.object({ 
  status: Joi.string().valid(...Object.values(ReminderType)).required(),
});