import Joi from 'joi';
import { profileSchema } from '../schemas/profile';


export const LoginSchema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string().email().optional(),
  tenantCode: Joi.string().optional(),
});


// Joi schema for validating landlord creation data
export const createLandlordSchema = Joi.object({
    userId: Joi.string().required(),
    properties: Joi.array().items(Joi.string().required()).optional(),
    tenants: Joi.array().items(Joi.string()), // Optional
    lnadlordSupportTicket: Joi.array().items(Joi.string()), // Optional
    transactions: Joi.array().items(Joi.string()), // Optional
    reviews: Joi.array().items(Joi.string()), // Optional
});

// Joi schema for validating landlord update data
export const updateLandlordSchema = Joi.object({
    emailDomains: Joi.string().optional(),
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
export const landlordSchema = Joi.object({
    id: Joi.string().required(),
    userId: Joi.string().required(),
    properties: Joi.array().items(Joi.string().required()).required(),
    tenants: Joi.array().items(Joi.string()), // Optional
    lnadlordSupportTicket: Joi.array().items(Joi.string()), // Optional
    transactions: Joi.array().items(Joi.string()), // Optional
    reviews: Joi.array().items(Joi.string()), // Optional
});


export const userLandlordSchema =  Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    isVerified: Joi.boolean().default(false),
    profile: profileSchema,
    landlord: createLandlordSchema,
});

// Define the allowed roles for validation
const roleEnum = ["WEBUSER", "ADMIN", "SUPERADMIN", "MANAGER"];

export const assignRoleSchema = Joi.object({
    userId: Joi.string().required(),
    roles: Joi.array().items(Joi.string().valid(...roleEnum)).required()
});