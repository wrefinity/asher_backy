import Joi from 'joi';

export const createReviewSchema = Joi.object({
  rating: Joi.number()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must be at most 5',
      'any.required': 'Rating is required',
    }),
  comment: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Comment must be a string',
      'string.max': 'Comment must be at most 500 characters',
    }),

  vendorId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Vendor ID must be a string',
      'any.required': 'Vendor ID is required',
    }),

  tenantId: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'Tenant ID must be a string',
    }),

  landlordId: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'Landlord ID must be a string',
    }),

  propertyId: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'Property ID must be a string',
    }),

  apartmentId: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'Apartment ID must be a string',
    }),

  reviewById: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'Review By ID must be a string',
    }),
});