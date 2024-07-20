import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().required(),
  attachments: Joi.array().items(Joi.string()).required(),
  scheduleDate: Joi.date().required(),
  offer: Joi.date().required(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  subcategoryIds: Joi.array().items(Joi.string()).required(),
  statusId: Joi.string().required(),
  serviceId: Joi.string().optional(),
});
