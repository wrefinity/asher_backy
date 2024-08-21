import Joi from 'joi';

export const createPropertyDocumentSchema = Joi.object({
  name: Joi.string().required(),
  documentUrl: Joi.string().uri().required(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
});

export const updatePropertyDocumentSchema = Joi.object({
  name: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional()
});
