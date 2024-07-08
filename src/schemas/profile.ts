import Joi from 'joi';

export const profileSchema = Joi.object({
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: Joi.string().optional(),
  dateOfBirth: Joi.date().iso().optional(),
  fullname: Joi.string().max(255),
  profileUrl: Joi.string().uri().optional()
});

