import Joi from 'joi';

export const createApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().optional(),
  response: Joi.string().valid('PENDING', 'ACCEPTED', 'REJECTED', 'RESCHEDULED').default('PENDING'),
  propertiesId: Joi.string().uuid().optional(),
  apartmentsId: Joi.string().uuid().optional(),
  tenantId: Joi.string().uuid().optional()
});

export const updateApplicationInviteSchema = Joi.object({
  scheduleDate: Joi.date().optional(),
  response: Joi.string().valid('PENDING', 'ACCEPTED', 'DECLINED', 'RESCHEDULED').optional(),
});