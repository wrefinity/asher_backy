import Joi from 'joi';

export const maintenanceSchema = Joi.object({
  description: Joi.string().optional(),
  scheduleDate: Joi.date().required(),
  offer: Joi.array().items(Joi.string()).required(),
  amount: Joi.number(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  categoryId: Joi.string().required(),
  vendorId: Joi.string().optional(),
  subcategoryIds: Joi.array().items(Joi.string()).required(),
  cloudinaryUrls: Joi.array().items(Joi.string()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  serviceId: Joi.string().required(),
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
  newScheduleDate: Joi.date().greater('now').required(),
});
