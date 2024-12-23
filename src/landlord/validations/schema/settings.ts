import Joi from 'joi';
import {PayableBy, PropsSettingType, LatePaymentFeeType} from '@prisma/client';
const propsSettingsType = Object.values(PropsSettingType);
const latePaymentFeeType = Object.values(LatePaymentFeeType);


console.log(...propsSettingsType)

export const propApartmentSettingsSchema = Joi.object({
    propertyId: Joi.string().required(),
    apartmentId: Joi.string().optional(),
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
    percentageOrAmount: Joi.number().required(),
    type: Joi.string().valid('SECURITY_DEPOSIT', 'RECURRING').required(),
});

export const propApartmentSettingsUpdateSchema = Joi.object({
    propertyId: Joi.string().optional(),
    apartmentId: Joi.string().optional(),
    lateFee: Joi.number().min(0).precision(2).optional(),
    latePaymentFeeType: Joi.string().valid('ONE_TIME', 'RECURRING').optional(),
});
export const propAvailabiltySchema = Joi.object({
    availability: Joi.string().valid('OCCUPIED', 'VACANT').required(),
});
