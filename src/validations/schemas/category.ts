import Joi from 'joi';
import { CategoryType } from "@prisma/client"
const catType = Object.values(CategoryType);


export const CategoryQuerySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Filters
  type: Joi.string().valid(...Object.values(CategoryType)),
  search: Joi.string().trim(),
  isDeleted: Joi.boolean().default(false),
  
  // Sorting
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export const categorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  categoryType: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  labels: Joi.array().items(Joi.string()).required()
});

export const subCategorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  type: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  // categoryId: Joi.string().required(),
  labels: Joi.array().items(Joi.string()).required()
});
