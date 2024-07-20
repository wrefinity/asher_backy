import Joi from 'joi';


export const categorySchema = Joi.object({
  name: Joi.string().required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  labels: Joi.array().items(Joi.string()).required()
});

export const subCategorySchema = Joi.object({
  name: Joi.string().required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  // categoryId: Joi.string().required(),
  labels: Joi.array().items(Joi.string()).required()
});
