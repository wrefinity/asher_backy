"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apartmentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.apartmentSchema = joi_1.default.object({
    code: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    size: joi_1.default.string().required(), // 2500sqf
    monthlyRent: joi_1.default.string().required(),
    minLeaseDuration: joi_1.default.string().required(),
    maxLeaseDuration: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    sittingRoom: joi_1.default.number().integer().min(0).optional(),
    waitingRoom: joi_1.default.number().integer().min(0).optional(),
    bedrooms: joi_1.default.number().integer().min(0).optional(),
    kitchen: joi_1.default.number().integer().min(0).optional(),
    bathrooms: joi_1.default.number().integer().min(0).optional(),
    garages: joi_1.default.number().integer().min(0).optional(),
    floorplans: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    facilities: joi_1.default.array().items(joi_1.default.string()).optional(),
    offices: joi_1.default.number().integer().min(0).optional(),
    isVacant: joi_1.default.boolean().default(true),
    rentalAmount: joi_1.default.number().positive().required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    propertyId: joi_1.default.string().optional()
});
