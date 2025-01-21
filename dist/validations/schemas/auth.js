"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleSchema = exports.userLandlordSchema = exports.landlordSchema = exports.updateLandlordSchema = exports.createLandlordSchema = exports.LoginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const profile_1 = require("../schemas/profile");
exports.LoginSchema = joi_1.default.object({
    password: joi_1.default.string().optional(),
    email: joi_1.default.string().email().optional(),
    tenantCode: joi_1.default.string().optional(),
});
// Joi schema for validating landlord creation data
exports.createLandlordSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    properties: joi_1.default.array().items(joi_1.default.string().required()).optional(),
    tenants: joi_1.default.array().items(joi_1.default.string()), // Optional
    lnadlordSupportTicket: joi_1.default.array().items(joi_1.default.string()), // Optional
    transactions: joi_1.default.array().items(joi_1.default.string()), // Optional
    reviews: joi_1.default.array().items(joi_1.default.string()), // Optional
});
// Joi schema for validating landlord update data
exports.updateLandlordSchema = joi_1.default.object({
    emailDomains: joi_1.default.string().optional(),
});
// export const updateLandlordSchema = Joi.object({
//     userId: Joi.string().optional(),
//     properties: Joi.array().items(Joi.string().required()).optional(),
//     tenants: Joi.array().items(Joi.string()).optional(), // Optional
//     lnadlordSupportTicket: Joi.array().items(Joi.string()).optional(), // Optional
//     transactions: Joi.array().items(Joi.string()).optional(), // Optional
//     reviews: Joi.array().items(Joi.string()).optional(), // Optional
// });
// Joi schema for validating landlord retrieval data (if needed)
exports.landlordSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    userId: joi_1.default.string().required(),
    properties: joi_1.default.array().items(joi_1.default.string().required()).required(),
    tenants: joi_1.default.array().items(joi_1.default.string()), // Optional
    lnadlordSupportTicket: joi_1.default.array().items(joi_1.default.string()), // Optional
    transactions: joi_1.default.array().items(joi_1.default.string()), // Optional
    reviews: joi_1.default.array().items(joi_1.default.string()), // Optional
});
exports.userLandlordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    isVerified: joi_1.default.boolean().default(false),
    profile: profile_1.profileSchema,
    landlord: exports.createLandlordSchema,
});
// Define the allowed roles for validation
const roleEnum = ["WEBUSER", "ADMIN", "SUPERADMIN", "MANAGER"];
exports.assignRoleSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    roles: joi_1.default.array().items(joi_1.default.string().valid(...roleEnum)).required()
});
