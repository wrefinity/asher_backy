import Joi from 'joi';

export const apartmentSchema = Joi.object({
    code: Joi.string().required(),
    name: Joi.string().required(),
    size: Joi.string().required(), // 2500sqf
    monthlyRent: Joi.string().required(),
    minLeaseDuration: Joi.string().required(),
    maxLeaseDuration: Joi.string().required(),
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
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
    propertyId: Joi.string().optional()
  });