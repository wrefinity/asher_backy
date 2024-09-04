import Joi from 'joi';

export const createPropertySchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    propertysize: Joi.number().integer().optional(),
    agencyId: Joi.string().optional(),
    yearBuilt: Joi.date().iso().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipcode: Joi.string().required(),
    location: Joi.string().optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    totalApartments: Joi.number().integer().optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
});

// Joi schema for validating property update data
export const updatePropertySchema = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    propertysize: Joi.number().integer().optional(),
    isDeleted: Joi.boolean().optional(),
    landlordId: Joi.string().optional(),
    agencyId: Joi.string().optional(),
    yearBuilt: Joi.date().iso().optional(),
    createdAt: Joi.date().iso().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    zipcode: Joi.string().optional(),
    location: Joi.string().optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    videourl: Joi.array().items(Joi.string().uri()).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    totalApartments: Joi.number().integer().optional(),
    transactions: Joi.array().items(Joi.string()).optional(),
    apartments: Joi.array().items(Joi.string()).optional(),
    ratings: Joi.array().items(Joi.string()).optional(),
    tenants: Joi.array().items(Joi.string()).optional(),
    inventory: Joi.array().items(Joi.string()).optional(),
    applicant: Joi.array().items(Joi.string()).optional(),
    maintenance: Joi.array().items(Joi.string()).optional(),
    reviews: Joi.array().items(Joi.string()).optional(),
    propertyDocument: Joi.array().items(Joi.string()).optional(),
});


export const createPropertyDocumentSchema = Joi.object({
  name: Joi.string().required(),
  // documentUrl: Joi.array().items(Joi.string()).optional(),
  cloudinaryUrls: Joi.array().items(Joi.string()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string()).optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
});

export const updatePropertyDocumentSchema = Joi.object({
  name: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional()
});
