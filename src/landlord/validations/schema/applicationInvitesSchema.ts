import Joi from 'joi';
import { InvitedResponse, ApplicationStatus, YesNo } from "@prisma/client"
const invitedResponseType = Object.values(InvitedResponse);
const YesNoType = Object.values(YesNo);
const ApplicationStatusType = Object.values(ApplicationStatus);

export const createApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().iso().optional(),
  response: Joi.string().valid(...invitedResponseType).default(InvitedResponse.PENDING).optional(),
  propertyListingId: Joi.string().optional(),
  userInvitedId: Joi.string().required(),
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

export const agreementDocumentSchema = Joi.object({
  templateId: Joi.string().required().messages({
    'string.empty': 'Template ID is required',
    'any.required': 'Template ID is required'
  }),
  templateVersion: Joi.number().integer().min(1).required().messages({
    'number.base': 'Template version must be a number',
    'number.integer': 'Template version must be an integer',
    'number.min': 'Template version must be at least 1',
    'any.required': 'Template version is required'
  }),
  documentUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Document URL must be a valid URI'
  }),
  processedContent: Joi.string().required(),
  variables: Joi.array().items(Joi.string()).required().messages({
    'array.base': 'Variables must be an array',
    'string.base': 'Each variable must be a string',
    'any.required': 'Variables are required (meaning the array of variable names to replace)'
  }),
  // applicationCreator: Joi.object({
  //   userId: Joi.string().required(),
  //   inviteId: Joi.string().required(),
  //   applicationFee: Joi.string().required()
  // }).optional(),

  metadata: Joi.object().optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});

export const updateAgreementSchema = Joi.object({
  templateId: Joi.string().optional(),
  templateVersion: Joi.number().integer().min(1).optional(),
  documentUrl: Joi.string().uri().optional(),
  processedContent: Joi.string().optional(),
  variables: Joi.object().optional(),
  metadata: Joi.object().optional(),
  signedByTenantAt: Joi.date().optional(),
  signedByLandlordAt: Joi.date().optional(),
  completedAt: Joi.date().optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});

export const createAgreementDocSchemaFuture = Joi.object({
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
}).custom((value, helpers) => {
  const hasDocuments = [
    value.cloudinaryUrls,
    value.cloudinaryAudioUrls,
    value.cloudinaryVideoUrls,
    value.cloudinaryDocumentUrls
  ].some(arr => arr && arr.length > 0);

  if (!hasDocuments) {
    return helpers.error('any.required');
  }

  return value;
}).messages({
  'any.required': 'supply the agreement document',

});