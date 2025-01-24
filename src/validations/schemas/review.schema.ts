import Joi from 'joi';

export const createReviewSchema = Joi.object({
  rating: Joi.number()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5',
      'any.required': 'Rating is required',
    }),

  comment: Joi.string()
    .optional()
    .allow(null, '')
    .max(500)
    .messages({
      'string.base': 'Comment must be a string',
      'string.max': 'Comment cannot be longer than 500 characters',
    }),

  tenantId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Tenant ID must be a string',
    }),

  vendorId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Vendor ID must be a string',
    }),

  landlordId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Landlord ID must be a string',
    }),

  propertyId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Property ID must be a string',
    }),

  apartmentId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Apartment ID must be a string',
    }),
})
  .or('tenantId', 'vendorId', 'landlordId', 'propertyId', 'apartmentId')  // Ensure at least one ID is present
  .messages({
    'object.missing': 'Please provide either tenantId, vendorId, landlordId, propertyId or apartmentId',
  })
  .xor('tenantId', 'vendorId', 'landlordId', 'propertyId', 'apartmentId')  // Ensure only one ID is provided
  .messages({
    'object.xor': 'You can only provide one of tenantId, vendorId, landlordId, propertyId or apartmentId',
  });



export const updateReviewSchema = Joi.object({
  rating: Joi.number()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5',
    }),

  comment: Joi.string()
    .optional()
    .allow(null, '')
    .max(500)
    .messages({
      'string.base': 'Comment must be a string',
      'string.max': 'Comment cannot be longer than 500 characters',
    }),

  tenantId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Tenant ID must be a string',
    }),

  vendorId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Vendor ID must be a string',
    }),

  landlordId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Landlord ID must be a string',
    }),

  propertyId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Property ID must be a string',
    }),

  apartmentId: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Apartment ID must be a string',
    }),
});
