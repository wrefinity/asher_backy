import Joi from 'joi';

export const propApartmentSettingsSchema = Joi.object({
    propertyId: Joi.string().required(),
    apartmentId: Joi.string().optional(),
    lateFee: Joi.number().min(0).precision(2).required(),
    latePaymentFeeType: Joi.string().valid('ONE_TIME', 'RECURRING').required(),
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
