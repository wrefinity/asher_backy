import Joi from 'joi';
import { CategoryType } from "@prisma/client"
import { uploadSchema } from './upload.schema';
import { stringJoiOptional, stringJoiRequired } from './base.schema';
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
  description: stringJoiOptional,
  icon: Joi.string().trim().max(64).optional().allow('', null),
  categoryType: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  labels: Joi.array().items(Joi.string()).required()
}).concat(uploadSchema);

export const subCategorySchema = Joi.object({
  name: stringJoiRequired,
  description: stringJoiOptional,
  type: Joi.string().valid(...catType).default(CategoryType.MAINTENANCE).required(),
  // categoryId: Joi.string().required(),
  labels: Joi.array().items(Joi.string()).required()
}).concat(uploadSchema);
