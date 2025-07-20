import Joi from 'joi';
export const postComplaintMessageSchema = Joi.object({


  message: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.base': 'Message must be a string.',
      'string.empty': 'Message cannot be empty.',
      'string.min': 'Message must be at least 1 character long.',
      'string.max': 'Message must be at most 1000 characters long.',
      'any.required': 'Message is required.',
    }),
});