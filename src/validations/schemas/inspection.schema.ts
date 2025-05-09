import Joi from 'joi';

export const createInspectionSchema = Joi.object({
  propertyId: Joi.string().required(),
  tenantId: Joi.string().required(),
  score: Joi.number().integer().min(0).max(100).required(),
  notes: Joi.string().allow('').optional(),
});

export const updateInspectionSchema = Joi.object({
  score: Joi.number().integer().min(0).max(100).optional(),
  notes: Joi.string().allow('').optional(),
});