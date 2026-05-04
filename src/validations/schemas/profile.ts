import Joi from 'joi';
import { Currency,PropertyType, TimeFormat, DateFormat, Language, NotificationCategory, NotificationChannel } from '@prisma/client';
import { uploadSchema } from './upload.schema';
import { booleanJoiOptional, stringJoiOptional } from './base.schema';

export const userSearchPreferenceSchema = Joi.object({
  types: Joi.array().items(Joi.string().valid(...Object.values(PropertyType))).min(1).required(),
  description: Joi.string().optional(),
});

export const profileSchema = Joi.object({
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  id: stringJoiOptional,
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: stringJoiOptional,
  dateOfBirth: Joi.date().iso().optional(),
  profileId: stringJoiOptional,
  fullname: Joi.string().max(255),
  zip: stringJoiOptional,
  unit: stringJoiOptional,
  title: stringJoiOptional,
  country: stringJoiOptional,
  firstName: stringJoiOptional,
  lastName: stringJoiOptional,
  middleName: stringJoiOptional,
  city: stringJoiOptional,
  state: stringJoiOptional,
  maritalStatus: stringJoiOptional,
  timeZone: stringJoiOptional,
  taxPayerId: stringJoiOptional,
  taxType: Joi.string().optional(),
  /** Stored on `landlords`, not `profile` — passed through for landlord profile update */
  businessName: Joi.string().max(255).optional().allow('', null),
}).concat(uploadSchema);

export const preferencesPrivacySchema = Joi.object({
  // Payment Account
  showBasicProfile: Joi.boolean().optional(),
  showContactDetails: Joi.bool().optional()
})

export const preferencesSchema = Joi.object({
  // Payment Account
  defaultPaymentAccountId: stringJoiOptional,

  // Display Preferences
  currency: Joi.string()
    .valid(...Object.values(Currency))
    .optional(),
  timeZone: Joi.string().optional(), 
  timeFormat: Joi.string()
    .valid(...Object.values(TimeFormat))
    .optional(),
  dateFormat: Joi.string()
    .valid(...Object.values(DateFormat))
    .optional(),
  region: Joi.string().optional(), // e.g., "US", "EU"
  language: Joi.string()
    .valid(...Object.values(Language))
    .default('ENGLISH'),

  // Privacy Settings
  showBasicProfile: Joi.boolean().default(true),
  showContactDetails: Joi.boolean().default(false),
});


const notificationChannelSchema = Joi.string()
  .valid(...Object.values(NotificationChannel))
  .required();

const baseNotificationSchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(NotificationCategory))
    .required(),
  channels: Joi.array().items(notificationChannelSchema).min(1).required(),
});


// Notification Preference Schema
export const notificationPreferenceSchema = Joi.object({
  preferences: Joi.array().items(
    Joi.object({
      category: Joi.string()
        .valid(...Object.values(NotificationCategory))
        .required(),
      channels: Joi.array()
        .items(Joi.string().valid(...Object.values(NotificationChannel)))
        .min(1)
        .required(),
      notifyOnLoginActivity: booleanJoiOptional,
      notifyOnNewMessages: booleanJoiOptional,
      notifyPaymentInitiated: booleanJoiOptional,
      notifyPaymentSuccess: booleanJoiOptional,
      notifyPaymentFailed: booleanJoiOptional,
      notifyNewMaintenanceRequest: booleanJoiOptional,
      notifyRequestStatusChange: booleanJoiOptional,
      notifyRequestMessage: booleanJoiOptional,
      notifyRequestResolved: booleanJoiOptional,
      notifyNewInvoice: booleanJoiOptional,
      notifyTenantMoveOut: booleanJoiOptional,
      notifyPropertyMatch: booleanJoiOptional,
      notifyNewInquiry: booleanJoiOptional,
      notifyNewSupportTicket: booleanJoiOptional,
      receiveMarketingEmails: booleanJoiOptional
    })
  ).min(1).required()
});