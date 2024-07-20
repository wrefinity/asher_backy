import Joi from 'joi';

export const apartmentSchema = Joi.object({
    code: Joi.string().required(),
    description: Joi.string().required(),
    sittingRoom: Joi.number().integer().min(0).optional(),
    waitingRoom: Joi.number().integer().min(0).optional(),
    bedrooms: Joi.number().integer().min(0).optional(),
    kitchen: Joi.number().integer().min(0).optional(),
    bathrooms: Joi.number().integer().min(0).optional(),
    garages: Joi.number().integer().min(0).optional(),
    floorplans: Joi.array().items(Joi.string().uri()).optional(),
    facilities: Joi.array().items(Joi.string()).optional(),
    offices: Joi.number().integer().min(0).optional(),
    isVacant: Joi.boolean().default(true),
    rentalAmount: Joi.number().positive().required(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
    videourl: Joi.string().uri().optional()
  });