"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateListingStatusSchema = exports.createPropertyListingSchema = exports.updatePropertyDocumentSchema = exports.createPropertyDocumentSchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const propertyType = Object.values(client_1.PropertyType);
const propertySpecificationType = Object.values(client_1.PropertySpecificationType);
exports.createPropertySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    propertysize: joi_1.default.number().optional(),
    agencyId: joi_1.default.string().optional(),
    // isWholeRent: Joi.boolean().required(),
    marketValue: joi_1.default.number().optional(),
    rentalFee: joi_1.default.number().optional(),
    // latePaymentFeeType: Joi.string().valid('ONE_TIME', 'DAILY').optional(),
    dueDate: joi_1.default.date().optional(),
    type: joi_1.default.string().valid(...propertyType).default(client_1.PropertyType.SINGLE_UNIT).required(),
    specificationType: joi_1.default.string().valid(...propertySpecificationType).default(client_1.PropertySpecificationType.RESIDENTIAL).required(),
    useTypeCategory: joi_1.default.string().optional(),
    // landlordId: Joi.string().required(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    currency: joi_1.default.string().required(),
    zipcode: joi_1.default.string().required(),
    location: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.date().iso().optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    totalApartments: joi_1.default.number().integer().optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
// Joi schema for validating property update data
exports.updatePropertySchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    propertysize: joi_1.default.number().integer().optional(),
    isDeleted: joi_1.default.boolean().optional(),
    landlordId: joi_1.default.string().optional(),
    agencyId: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.date().iso().optional(),
    createdAt: joi_1.default.date().iso().optional(),
    city: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    country: joi_1.default.string().optional(),
    zipcode: joi_1.default.string().optional(),
    location: joi_1.default.string().optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    videourl: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    totalApartments: joi_1.default.number().integer().optional(),
    transactions: joi_1.default.array().items(joi_1.default.string()).optional(),
    apartments: joi_1.default.array().items(joi_1.default.string()).optional(),
    ratings: joi_1.default.array().items(joi_1.default.string()).optional(),
    tenants: joi_1.default.array().items(joi_1.default.string()).optional(),
    inventory: joi_1.default.array().items(joi_1.default.string()).optional(),
    applicant: joi_1.default.array().items(joi_1.default.string()).optional(),
    maintenance: joi_1.default.array().items(joi_1.default.string()).optional(),
    reviews: joi_1.default.array().items(joi_1.default.string()).optional(),
    propertyDocument: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.createPropertyDocumentSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    // cloudinaryUrls: Joi.array().items(Joi.string()).optional(),
    // cloudinaryVideoUrls: Joi.array().items(Joi.string()).optional(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
});
exports.updatePropertyDocumentSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    documentUrl: joi_1.default.string().uri().optional(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional()
});
// property listing schema
const listingTypes = Object.values(client_1.ListingType);
const shortletType = Object.values(client_1.ShortletType);
exports.createPropertyListingSchema = joi_1.default.object({
    payApplicationFee: joi_1.default.boolean().required(),
    isShortlet: joi_1.default.boolean().required(),
    shortletDuration: joi_1.default.string().valid(...shortletType).default(client_1.ShortletType.MONTHLY).required(),
    type: joi_1.default.string().valid(...listingTypes).default(client_1.ListingType.LISTING_WEBSITE).required(),
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
});
exports.updateListingStatusSchema = joi_1.default.object({
    isLeased: joi_1.default.boolean().required(),
});
