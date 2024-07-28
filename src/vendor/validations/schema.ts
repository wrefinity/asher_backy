import Joi from 'joi';

// Joi validation schema
export const serviceSchema = Joi.object({
  currentJobs: Joi.number().optional(),
  availability: Joi.string().valid('YES', 'NO').required(),
  standardPriceRange: Joi.string().required(),
  mediumPriceRange: Joi.string().required(),
  premiumPriceRange: Joi.string().required(),
  categoryId: Joi.string().required(),
  subcategoryId: Joi.string().required(),
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