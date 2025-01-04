import Joi from 'joi';

export const profileSchema = Joi.object({
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: Joi.string().optional(),
  dateOfBirth: Joi.date().iso().optional(),
  profileId: Joi.string().optional(),
  fullname: Joi.string().max(255),
  zip: Joi.string().optional(),
  unit: Joi.string().optional(),
  title: Joi.string().optional(),
  country: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  maritalStatus: Joi.string().optional(),
  timeZone: Joi.string().optional(),
  taxPayerId: Joi.string().optional(),
  taxType: Joi.string().optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});
