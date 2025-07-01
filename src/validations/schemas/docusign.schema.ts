import Joi from 'joi';

export const createDocuTemplateSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().max(500).optional(),
  content: Joi.string().required(),
  isActive: Joi.boolean().optional()
});

export const updateDocuTemplateSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  content: Joi.string().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const assignDocuTemplateSchema = Joi.object({
  // userId: Joi.string().required(),
  templateId: Joi.string().required(),
  isDefault: Joi.boolean().optional()
});

export const createVersionSchema = Joi.object({
  content: Joi.string().required()
});