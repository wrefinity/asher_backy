"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSchema = exports.userSearchPreferenceSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
exports.userSearchPreferenceSchema = joi_1.default.object({
    types: joi_1.default.array().items(joi_1.default.string().valid(...Object.values(client_1.PropertyType))).min(1).required(),
    description: joi_1.default.string().optional(),
});
exports.profileSchema = joi_1.default.object({
    gender: joi_1.default.string().valid('Male', 'Female', 'Other'),
    id: joi_1.default.string().optional(),
    phoneNumber: joi_1.default.string().pattern(/^[0-9]{10,15}$/).optional(),
    address: joi_1.default.string().optional(),
    dateOfBirth: joi_1.default.date().iso().optional(),
    profileId: joi_1.default.string().optional(),
    fullname: joi_1.default.string().max(255),
    zip: joi_1.default.string().optional(),
    unit: joi_1.default.string().optional(),
    title: joi_1.default.string().optional(),
    country: joi_1.default.string().optional(),
    firstName: joi_1.default.string().optional(),
    lastName: joi_1.default.string().optional(),
    middleName: joi_1.default.string().optional(),
    city: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    maritalStatus: joi_1.default.string().optional(),
    timeZone: joi_1.default.string().optional(),
    taxPayerId: joi_1.default.string().optional(),
    taxType: joi_1.default.string().optional(),
    cloudinaryAudioUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
