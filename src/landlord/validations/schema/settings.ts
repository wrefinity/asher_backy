import Joi from 'joi';

export const propApartmentSettingsSchema = Joi.object({
    propertyId: Joi.string().required(),
    apartmentId: Joi.string().optional(),
    lateFee: Joi.number().min(0).precision(2).optional(),
    lateFeeFrequency: Joi.string().valid('ONE_TIME', 'DAILY', 'WEEKLY').optional(),
    lateFeePercentage: Joi.number().optional(),
    gracePeriodDays: Joi.string().optional(),
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
