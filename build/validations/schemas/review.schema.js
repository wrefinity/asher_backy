"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createReviewSchema = joi_1.default.object({
    rating: joi_1.default.number()
        .min(1)
        .max(5)
        .required()
        .messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must not exceed 5',
        'any.required': 'Rating is required',
    }),
    comment: joi_1.default.string()
        .optional()
        .allow(null, '')
        .max(500)
        .messages({
        'string.base': 'Comment must be a string',
        'string.max': 'Comment cannot be longer than 500 characters',
    }),
    tenantId: joi_1.default.string()
        .optional()
        .allow(null, '')
        .messages({
        'string.base': 'Tenant ID must be a string',
    }),
    vendorId: joi_1.default.string()
        .optional()
        .allow(null, '')
        .messages({
        'string.base': 'Vendor ID must be a string',
    }),
    landlordId: joi_1.default.string()
        .optional()
        .allow(null, '')
        .messages({
        'string.base': 'Landlord ID must be a string',
    }),
    propertyId: joi_1.default.string()
        .optional()
        .allow(null, '')
        .messages({
        'string.base': 'Property ID must be a string',
    }),
    apartmentId: joi_1.default.string()
        .optional()
        .allow(null, '')
        .messages({
        'string.base': 'Apartment ID must be a string',
    }),
})
    .or('tenantId', 'vendorId', 'landlordId', 'propertyId', 'apartmentId') // Ensure at least one ID is present
    .messages({
    'object.missing': 'Please provide either tenantId, vendorId, landlordId, propertyId or apartmentId',
})
    .xor('tenantId', 'vendorId', 'landlordId', 'propertyId', 'apartmentId') // Ensure only one ID is provided
    .messages({
    'object.xor': 'You can only provide one of tenantId, vendorId, landlordId, propertyId or apartmentId',
});
