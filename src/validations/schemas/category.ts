import Joi from 'joi';
import { CategoryType } from "@prisma/client"
const catType = Object.values(CategoryType);


export const categorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  categoryType: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  labels: Joi.array().items(Joi.string()).required()
});

export const subCategorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  type: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  // categoryId: Joi.string().required(),
  labels: Joi.array().items(Joi.string()).required()
});
