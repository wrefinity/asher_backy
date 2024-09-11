import Joi from 'joi';

export const bankInfoSchema = Joi.object({
//   landlordId: Joi.string().optional().allow(null),
//   vendorId: Joi.string().optional().allow(null),
  bankName: Joi.string().min(2).max(100).required(),
  accountNumber: Joi.string().min(10).max(20).required(),
  accountName: Joi.string().min(2).max(100).required(),
});
