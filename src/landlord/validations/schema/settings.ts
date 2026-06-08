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
  /** % of billing period before late fee applies (e.g. 20 = 20% of monthly cycle). */
  lateFeeGracePeriod: Joi.number().min(0).max(100).optional(),
  lateFeeFrequency: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  
  // Total deposit as % of one rent period: 100 + increase (e.g. 20% increase → 120).
  depositPercentage: Joi.number().min(100).max(600).precision(2).optional(),
  
  // Refund Settings
  refundTimeframe: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  refundPolicy: Joi.string().valid(...Object.values(RefundPolicyType)).optional(),
  refundPartialPercentage: Joi.number().min(1).max(100).precision(2).optional(),
  
  // Application Fee Settings
  applicationFeePercentage: Joi.number().min(0).max(100).precision(2).optional(),
  
  // Notification Settings
  notificationEnabled: Joi.boolean().default(false),
  /** % of billing period before rent is due. */
  notificationFrequency: Joi.number().min(0).max(100).optional(),
  billReminderLeadPercent: Joi.number().min(0).max(100).optional(),
  reminderMethods: Joi.array().items(
    Joi.string().valid(...Object.values(ReminderMethodType))
  ).default([]),

  leaseRenewalRemindersEnabled: Joi.boolean().default(false),
  leaseRenewalReminderFirst: Joi.number().min(1).max(100).optional(),
  leaseRenewalReminderSecond: Joi.number().min(1).max(100).optional(),
  leaseRenewalReminderFinal: Joi.number().min(1).max(100).optional(),

  holdingDepositMaxWeeks: Joi.number().min(0).max(52).precision(2).optional(),
  rentIncreaseNoticeDays: Joi.number().integer().min(0).max(365).optional(),
  defaultRentCollectionFrequency: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  lateFeeMaxPercent: Joi.number().min(0).max(100).precision(2).optional(),

  autoCreateRentBill: Joi.boolean().default(false),
  defaultRentDueDay: Joi.number().integer().min(1).max(28).optional(),
  depositReturnTimeframe: Joi.string().valid(...Object.values(FrequencyType)).optional(),
  inspectionNoticeHours: Joi.number().integer().min(1).max(168).optional(),

  /** Minimum years of address history on tenant applications (current + previous). */
  minimumTenancyHistoryYears: Joi.number().integer().min(0).max(20).optional(),
});

export const propApartmentSettingsUpdateSchema = Joi.object({
    propertyId: Joi.string().optional(),
    lateFee: Joi.number().min(0).precision(2).optional(),
    latePaymentFeeType: Joi.string().valid('ONE_TIME', 'RECURRING').optional(),
});
export const propAvailabiltySchema = Joi.object({
    availability: Joi.string().valid(...Object.keys(AvailabilityStatus)).required(),
});
