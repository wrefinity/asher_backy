import Joi from 'joi';
import { Currency,PropertyType, TimeFormat, DateFormat, Language, NotificationCategory, NotificationChannel } from '@prisma/client';

export const userSearchPreferenceSchema = Joi.object({
  types: Joi.array().items(Joi.string().valid(...Object.values(PropertyType))).min(1).required(),
  description: Joi.string().optional(),
});

export const profileSchema = Joi.object({
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  id: Joi.string().optional(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: Joi.string().optional(),
  dateOfBirth: Joi.date().iso().optional(),
  profileId: Joi.string().optional(),
  fullname: Joi.string().max(255),
  zip: Joi.string().optional(),
  unit: Joi.string().optional(),
  title: Joi.string().optional(),
  country: Joi.string().optional(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  middleName: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  maritalStatus: Joi.string().optional(),
  timeZone: Joi.string().optional(),
  taxPayerId: Joi.string().optional(),
  taxType: Joi.string().optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});

export const preferencesPrivacySchema = Joi.object({
  // Payment Account
  showBasicProfile: Joi.boolean().optional(),
  showContactDetails: Joi.bool().optional()
})

export const preferencesSchema = Joi.object({
  // Payment Account
  defaultPaymentAccountId: Joi.string().optional(),

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
      notifyOnLoginActivity: Joi.boolean().optional(),
      notifyOnNewMessages: Joi.boolean().optional(),
      notifyPaymentInitiated: Joi.boolean().optional(),
      notifyPaymentSuccess: Joi.boolean().optional(),
      notifyPaymentFailed: Joi.boolean().optional(),
      notifyNewMaintenanceRequest: Joi.boolean().optional(),
      notifyRequestStatusChange: Joi.boolean().optional(),
      notifyRequestMessage: Joi.boolean().optional(),
      notifyRequestResolved: Joi.boolean().optional(),
      notifyNewInvoice: Joi.boolean().optional(),
      notifyTenantMoveOut: Joi.boolean().optional(),
      notifyPropertyMatch: Joi.boolean().optional(),
      notifyNewInquiry: Joi.boolean().optional(),
      notifyNewSupportTicket: Joi.boolean().optional(),
      receiveMarketingEmails: Joi.boolean().optional()
    })
  ).min(1).required()
});