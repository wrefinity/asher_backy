import Joi from 'joi';


export const categorySchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().required(),
  labels: Joi.array().items(Joi.string()).required()
});

export const subCategorySchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().required(),
  categoryId: Joi.string().required(),
  label: Joi.array().items(Joi.string()).required()
});
