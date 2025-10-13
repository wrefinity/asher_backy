import Joi from 'joi';

export const EventSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    date: Joi.date().required(),
    color: Joi.string().optional().default("blue")
});

export const UpdateEventSchema = Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    startTime: Joi.date().optional(),
    endTime: Joi.date().optional(),
    date: Joi.date().optional(),
    color: Joi.string().optional()
});