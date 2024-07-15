import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().required(),
  attachments: Joi.array().items(Joi.string()).required(),
  priority: Joi.string().required(),
  scheduleDate: Joi.date().required(),
  scheduleTime: Joi.date().required(),
  userId: Joi.string().required(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  subcategoryId: Joi.string().required(),
  statusId: Joi.string().required(),
});
