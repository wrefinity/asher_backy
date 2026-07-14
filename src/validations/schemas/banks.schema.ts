import Joi from 'joi';

export const bankInfoSchema = Joi.object({
  bankName: Joi.string().min(2).max(100).required(),
  accountNumber: Joi.string().min(10).max(20).required(),
  accountName: Joi.string().min(2).max(100).required(),
  // Country routing for payouts (Part 3 §5 of VENDOR_APP_FLOW_SPEC.md).
  currency: Joi.string().valid('NGN', 'GBP', 'USD', 'EUR').optional(),
  country: Joi.string().max(60).optional(),
  // Paystack bank code - required to create the NGN transfer recipient.
  bankCode: Joi.string().max(20).optional(),
  isDefault: Joi.boolean().optional(),
});
