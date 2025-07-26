import Joi from 'joi';
import { PropsSettingType, LatePaymentFeeType, AvailabilityStatus, FrequencyType, RefundPolicyType, ReminderMethodType} from '@prisma/client';
import { SettingType } from '../interfaces/propsSettings';
const propsSettingsType = Object.values(PropsSettingType);
const latePaymentFeeType = Object.values(LatePaymentFeeType);


export const propApartmentSettingsSchema = Joi.object({
    propertyId: Joi.string().required(),
    lateFee: Joi.number().min(0).precision(2).optional(),
    lateFeeFrequency: Joi.string().valid(...latePaymentFeeType).optional(),
    lateFeePercentage: Joi.number().optional(),
    gracePeriodDays: Joi.string().optional(),
    //define the setting type
    settingType: Joi.string().valid(...propsSettingsType).default(PropsSettingType.NOT_DEFINED).required(),
    // security deposit
    depositPercentage: Joi.number().optional(),
    refundTimeframe: Joi.string().optional(),
    // application section
    applicationFee: Joi.number().optional(), 
    refundPolicy: Joi.string().valid('YES', 'NO').optional()
});


export const GlobalSettingsSchema = Joi.object({
  id: Joi.string().optional(),
  // Late Fee Settings
  lateFeeEnabled: Joi.boolean().default(false),
  lateFeePercentage: Joi.number().min(0).max(100).precision(2).optional(),
  lateFeeGracePeriod: Joi.number().integer().min(0).max(365).optional(),
  lateFeeFrequency: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  
  // Deposit Settings
  depositPercentage: Joi.number().min(0).max(100).precision(2).optional(),
  
  // Refund Settings
  refundTimeframe: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  refundPolicy: Joi.string().valid(...Object.values(RefundPolicyType)).optional(),
  
  // Application Fee Settings
  applicationFeePercentage: Joi.number().min(0).max(100).precision(2).optional(),
  
  // Notification Settings
  notificationEnabled: Joi.boolean().default(false),
  notificationFrequency: Joi.number().integer().min(1).max(365).optional(),
  reminderMethods: Joi.array().items(
    Joi.string().valid(...Object.values(ReminderMethodType))
  ).default([]),
});

export const propApartmentSettingsUpdateSchema = Joi.object({
    propertyId: Joi.string().optional(),
    lateFee: Joi.number().min(0).precision(2).optional(),
    latePaymentFeeType: Joi.string().valid('ONE_TIME', 'RECURRING').optional(),
});
export const propAvailabiltySchema = Joi.object({
    availability: Joi.string().valid(...Object.keys(AvailabilityStatus)).required(),
});
