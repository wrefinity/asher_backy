import Joi from "joi";
import {PayableBy, PaymentFrequency} from '@prisma/client';
const payableByValues = Object.values(PayableBy);
const paymentFreq = Object.values(PaymentFrequency);

const billCategorySchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required()
})
const billSchema = Joi.object({
    billName: Joi.string().required(),
    billCategoryId: Joi.string().required(),
    description: Joi.string().required(),
    amount: Joi.number().required(),
    billFrequency: Joi.string().valid(...paymentFreq).required(),
    dueDate: Joi.date().iso().required(),
    propertyId: Joi.string().optional(),
    payableBy: Joi.string().valid(...payableByValues).default(PayableBy.LANDLORD).required(),
    // tenants bills should be optional
    tenantId: Joi.string().optional()
})
const billUpdateSchema = Joi.object({
    billName: Joi.string().optional(),
    description: Joi.string().optional(),
    amount: Joi.number().optional(),
    billFrequency: Joi.string().valid(...paymentFreq).optional(),
    dueDate: Joi.date().iso().optional(),
    payableBy: Joi.string().valid(...payableByValues).default(PayableBy.LANDLORD).optional(),
    // tenants bills should be optional
    tenantId: Joi.string().optional()
})
export { billSchema, billUpdateSchema, billCategorySchema };