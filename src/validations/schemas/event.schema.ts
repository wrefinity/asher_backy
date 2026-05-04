import Joi from 'joi';
import { dateJoiOptional, dateJoiRequired, stringJoiOptional, stringJoiRequired } from './base.schema';

export const EventSchema = Joi.object({
    title: stringJoiRequired,
    description: stringJoiOptional,
    startTime: dateJoiRequired,
    endTime: dateJoiRequired,
    date: dateJoiRequired,
    color: Joi.string().optional().default("blue")
});

export const UpdateEventSchema = Joi.object({
    title: stringJoiOptional,
    description: stringJoiOptional,
    startTime: dateJoiOptional,
    endTime: dateJoiOptional,
    date: dateJoiOptional,
    color: stringJoiOptional
});