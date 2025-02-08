import Joi from 'joi';
import {ListingType, PropertyType, PropertySpecificationType, ShortletType} from "@prisma/client"

const propertyType = Object.values(PropertyType);
const propertySpecificationType = Object.values(PropertySpecificationType);

export const createPropertySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  propertysize: Joi.number().optional(),
  agencyId: Joi.string().optional(),
  // isWholeRent: Joi.boolean().required(),
  marketValue: Joi.number().optional(),
  rentalFee: Joi.number().optional(),
  longitude: Joi.number().optional(),
  latitude: Joi.number().optional(),
  // latePaymentFeeType: Joi.string().valid('ONE_TIME', 'DAILY').optional(),
  dueDate: Joi.date().optional(),
  type:   Joi.string().valid(...propertyType).default(PropertyType.SINGLE_UNIT).required(),
  specificationType:   Joi.string().valid(...propertySpecificationType).default(PropertySpecificationType.RESIDENTIAL).required(),
  useTypeCategory:   Joi.string().optional(),
  // landlordId: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  currency: Joi.string().required(),
  zipcode: Joi.string().required(),
  location: Joi.string().optional(),
  yearBuilt: Joi.date().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  totalApartments: Joi.number().integer().optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
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
  cloudinaryDocumentUrls: Joi.array().items(Joi.string()).optional(),
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

// property listing schema
const listingTypes = Object.values(ListingType);
const shortletType = Object.values(ShortletType);
export const createPropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().required(),
  isShortlet: Joi.boolean().required(),
  shortletDuration: Joi.string().valid(...shortletType).default(ShortletType.MONTHLY).required(),
  type: Joi.string().valid(...listingTypes).default(ListingType.LISTING_WEBSITE).required(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
});
export const updatePropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().optional(),
  isShortlet: Joi.boolean().optional(),
  shortletDuration: Joi.string().valid(...shortletType).default(ShortletType.MONTHLY).optional(),
  type: Joi.string().valid(...listingTypes).default(ListingType.LISTING_WEBSITE).optional(),
  // propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  onListing: Joi.boolean().optional()
});

export const updateListingStatusSchema = Joi.object({
  isLeased: Joi.boolean().required(),
});



export const createPropertyViewingSchema = Joi.object({
  isLiked: Joi.boolean().optional(),
  review: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

export const updatePropertyViewingSchema = Joi.object({
  isLiked: Joi.boolean().optional(),
  review: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});
