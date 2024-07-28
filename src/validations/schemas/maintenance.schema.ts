import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().optional(),
  scheduleDate: Joi.date().required(),
  offer: Joi.array().items(Joi.string()).required(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  vendorId: Joi.string().optional(),
  subcategoryIds: Joi.array().items(Joi.string()).required(),
  cloudinaryUrls: Joi.array().items(Joi.string()).optional(),
  serviceId: Joi.string().required(),
});