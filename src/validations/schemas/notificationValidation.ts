import Joi from 'joi';

export const createNotificationSchema = Joi.object({
    sourceId: Joi.string().required(),
    destId: Joi.string().required(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    isRead: Joi.boolean().default(false),
});
