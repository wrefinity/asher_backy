import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().optional(),
  scheduleDate: Joi.date().iso().optional(),
  offer: Joi.array().items(Joi.string()).optional(),
  amount: Joi.number().optional(),
  propertyId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  vendorId: Joi.string().optional(),
  subcategoryIds: Joi.array().items(Joi.string()).required(),
  attachments: Joi.array().items(Joi.string()).optional(),
  // images: Joi.array().items(Joi.string()).optional(),
  // videos: Joi.array().items(Joi.string().uri()).optional(),
  // documents: Joi.array().items(Joi.string().uri()).optional(),
  serviceId: Joi.string().optional(),
});

export const maintenanceCancelSchema = Joi.object({
  reason: Joi.string().optional(),
});

export const checkWhitelistedSchema = Joi.object({
  propertyId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  // subcategoryIds: Joi.array().items(Joi.string()).optional(),
  subcategoryId: Joi.string().optional(),
});
export const maintenanceChatSchema = Joi.object({
  receiverId: Joi.string().required(),
  message: Joi.string().required(),
});

export const rescheduleMaintenanceSchema = Joi.object({
  // maintenanceId: Joi.string().required(),
  scheduleDate: Joi.date().greater('now').required(),
});




export const createQuoteValidation = Joi.object({
  maintenanceId: Joi.string().required().messages({
    'string.empty': 'Maintenance ID is required',
    'any.required': 'Maintenance ID is required'
  }),
  amount: Joi.number().min(0).required().messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount cannot be negative',
    'any.required': 'Amount is required'
  }),
  description: Joi.string().optional().allow(''),
  estimatedCompletionTime: Joi.string().optional().allow(''),
  breakdown: Joi.array().items(
    Joi.object({
      item: Joi.string().required().messages({
        'string.empty': 'Item name is required',
        'any.required': 'Item name is required'
      }),
      description: Joi.string().optional().allow(''),
      cost: Joi.number().min(0).required().messages({
        'number.base': 'Cost must be a number',
        'number.min': 'Cost cannot be negative',
        'any.required': 'Cost is required'
      }),
      quantity: Joi.number().min(1).default(1).messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1'
      })
    })
  ).optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});

export const updateQuoteValidation = Joi.object({
  amount: Joi.number().min(0).optional().messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount cannot be negative'
  }),
  description: Joi.string().optional().allow(''),
  estimatedCompletionTime: Joi.string().optional().allow(''),
  breakdown: Joi.array().items(
    Joi.object({
      item: Joi.string().required().messages({
        'string.empty': 'Item name is required',
        'any.required': 'Item name is required'
      }),
      description: Joi.string().optional().allow(''),
      cost: Joi.number().min(0).required().messages({
        'number.base': 'Cost must be a number',
        'number.min': 'Cost cannot be negative',
        'any.required': 'Cost is required'
      }),
      quantity: Joi.number().min(1).default(1).messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1'
      })
    })
  ).optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});


