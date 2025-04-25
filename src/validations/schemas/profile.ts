import Joi from 'joi';
import { PropertyType } from '@prisma/client';

export const userSearchPreferenceSchema = Joi.object({
  types: Joi.array().items(Joi.string().valid(...Object.values(PropertyType))).min(1).required(),
  description: Joi.string().optional(),
});

export const profileSchema = Joi.object({
  gender: Joi.string().valid('Male', 'Female', 'Other'),
  id: Joi.string().optional(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: Joi.string().optional(),
  dateOfBirth: Joi.date().iso().optional(),
  profileId: Joi.string().optional(),
  fullname: Joi.string().max(255),
  zip: Joi.string().optional(),
  unit: Joi.string().optional(),
  title: Joi.string().optional(),
  country: Joi.string().optional(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  middleName: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  maritalStatus: Joi.string().optional(),
  timeZone: Joi.string().optional(),
  taxPayerId: Joi.string().optional(),
  taxType: Joi.string().optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});
