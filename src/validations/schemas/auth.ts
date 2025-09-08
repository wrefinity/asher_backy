import Joi from 'joi';
import { profileSchema } from '../schemas/profile';
import { userRoles } from "@prisma/client";
import { uploadSchema } from './upload.schema';


export const LoginSchema = Joi.object({
  email: Joi.string().email().lowercase(),
  password: Joi.string(),
  tenantCode: Joi.string()
})
  .xor('email', 'tenantCode') // enforce only one of them
  .when(Joi.object({ email: Joi.exist() }).unknown(), {
    then: Joi.object({
      password: Joi.string().required(), // require password only if email is used
    }),
  })
  .when(Joi.object({ tenantCode: Joi.exist() }).unknown(), {
    then: Joi.object({
      password: Joi.forbidden(), // forbid password if tenantCode is used
      email: Joi.forbidden(),    // forbid email if tenantCode is used
    }),
  })
  .messages({
    'object.missing': 'Either email or tenantCode is required',
    'object.xor': 'Cannot provide both email and tenantCode',
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


export const userLandlordSchema = Joi.object({
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().min(6).required(),
  isVerified: Joi.boolean().default(false),
  profile: profileSchema,
  landlord: createLandlordSchema,
});

export const assignRoleSchema = Joi.object({
  userId: Joi.string().required(),
  roles: Joi.array().items(Joi.string().valid(...Object.values(userRoles))).required()
});

export const ConfirmationSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  token: Joi.string()
    .required()
    .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/)
    .messages({
      'string.empty': 'Verification token is required',
      'any.required': 'Verification token is required',
      'string.pattern.base': 'Invalid token format'
    })
});

export const RegisterSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 30 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'Password is required'
    })
});

// Register vendor schema
export const RegisterVendorSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 30 characters',
      'string.pattern.base':
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'Password is required',
    }),

  profile: Joi.object()
    .concat(profileSchema)
    .required()
    .messages({
      'any.required': 'Profile information is required',
    }),

  ...uploadSchema.describe().keys,
});