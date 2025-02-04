import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().optional(),
  scheduleDate: Joi.date().iso().optional(),
  offer: Joi.array().items(Joi.string()).optional(),
  amount: Joi.number().optional(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
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
  apartmentId: Joi.string().optional(),
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
