import Joi from "joi";
import {PayableBy} from '@prisma/client';
const billFrequencyType = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
const payableByValues = Object.values(PayableBy);

const billSchema = Joi.object({
    billName: Joi.string().required(),
    billCategory: Joi.string().required(),
    amount: Joi.number().required(),
    billFrequency: Joi.string().valid(...billFrequencyType).required(),
    dueDate: Joi.date().iso().required(),
    propertyId: Joi.string().optional(),
    apartmentId: Joi.string().optional(),
    payableBy: Joi.string().valid(...payableByValues).default(PayableBy.LANDLORD).required(),
    // tenants bills should be optional
    tenantId: Joi.string().optional()
})

// const tenantBillSchema = Joi.object({
//     billName: Joi.string().required(),
//     billCategory: Joi.string().required(),
//     amount: Joi.number().required(),
//     billFrequency: Joi.string().valid(...billFrequencyType).required(),
//     dueDate: Joi.date().iso().required(),
//     propertyId: Joi.string().required(),
//     tenantId: Joi.string().required(),
//     payableBy: Joi.string().valid(...payableByValues).default(PayableBy.LANDLORD).required(),
// })

// export { billSchema, tenantBillSchema };
export { billSchema };