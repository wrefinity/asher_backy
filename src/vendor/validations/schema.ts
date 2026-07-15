import Joi from 'joi';

// Joi validation schema
export const serviceSchema = Joi.object({
  currentJobs: Joi.number().optional(),
  availability: Joi.string().valid('YES', 'NO').default("YES").optional(),
  // Tier prices are only required when FIXED_TIERS is among the enabled
  // payment types (Part 1 §5 of VENDOR_APP_FLOW_SPEC.md, refined
  // 2026-07-13); a quotation-only service has no tier prices.
  standardPriceRange: Joi.string().allow('').optional(),
  mediumPriceRange: Joi.string().allow('').optional(),
  premiumPriceRange: Joi.string().allow('').optional(),
  categoryId: Joi.string().required(),
  subcategoryId: Joi.string().required(),
  paymentTypes: Joi.array()
    .items(Joi.string().valid('FIXED_TIERS', 'ONE_OFF', 'QUOTATION'))
    .min(1)
    .default(['FIXED_TIERS'])
    .optional(),
  oneOffPrice: Joi.number().positive().optional(),
  description: Joi.string().max(4000).allow('').optional(),
  referencesOnboardingCertificate: Joi.boolean().optional(),
  proofUrls: Joi.array().items(Joi.string().uri()).default([]).optional(),
}).custom((value, helpers) => {
  const types: string[] = value.paymentTypes ?? ['FIXED_TIERS'];
  if (
    types.includes('FIXED_TIERS') &&
    (!value.standardPriceRange || !value.mediumPriceRange || !value.premiumPriceRange)
  ) {
    return helpers.error('any.custom', {
      message: 'standardPriceRange, mediumPriceRange and premiumPriceRange are required when fixed-tier pricing is enabled',
    });
  }
  if (types.includes('ONE_OFF') && value.oneOffPrice == null) {
    return helpers.error('any.custom', { message: 'oneOffPrice is required when one-off pricing is enabled' });
  }
  return value;
});



// {
//   "plan":"standard",
//   "subcategoryIds":["clysffhoy0001w3190ywm99lh"]
// } 

export const applyOfferSchema = Joi.object({
  params: Joi.object({
    categoryId: Joi.string().required()
  }),
  body: Joi.object({
    subcategoryIds: Joi.array().items(Joi.string().required()).required(),
    plan: Joi.string().valid('standard', 'medium', 'premium').optional(),
    offer: Joi.number().optional(),
  })
});