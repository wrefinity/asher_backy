import Joi from "joi";

const billFrequencyType = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

const billSchema = Joi.object({
    billName: Joi.string().required(),
    billCategory: Joi.string().required(),
    amount: Joi.number().required(),
    billFrequency: Joi.string().valid(...billFrequencyType).required(),
    dueDate: Joi.date().iso().required(),
    propertyId: Joi.string().required()
})

const tenantBillSchema = Joi.object({
    billName: Joi.string().required(),
    billCategory: Joi.string().required(),
    amount: Joi.number().required(),
    billFrequency: Joi.string().valid(...billFrequencyType).required(),
    dueDate: Joi.date().iso().required(),
    propertyId: Joi.string().required(),
    tenantId: Joi.string().required()
})

export { billSchema, tenantBillSchema };