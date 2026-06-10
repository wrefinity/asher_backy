import Joi from 'joi';

const certType = Joi.string().valid(
  'GAS_SAFETY',
  'EICR',
  'EPC',
  'FIRE_RISK_ASSESSMENT',
  'LEGIONELLA',
  'HMO_LICENCE',
  'ASBESTOS',
  'PAT_TESTING',
  'SMOKE_CO_ALARM',
  'LEAD_PAINT_DISCLOSURE',
  'BUSINESS_FIRE_SAFETY',
  'EMERGENCY_LIGHTING',
  'PLANNING_PERMISSION',
  'OTHER'
);

const complianceRecordSchema = Joi.object({
  id: Joi.string().optional(),
  certType: certType.required(),
  certificateNumber: Joi.string().allow('', null).optional(),
  issueDate: Joi.date().iso().allow(null).optional(),
  expiryDate: Joi.date().iso().allow(null).optional(),
  status: Joi.string()
    .valid('VALID', 'EXPIRED', 'EXPIRING_SOON', 'PENDING', 'NOT_APPLICABLE')
    .optional(),
  documentId: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
});

const insuranceSchema = Joi.object({
  id: Joi.string().optional(),
  insuranceType: Joi.string()
    .valid(
      'BUILDINGS',
      'CONTENTS',
      'LANDLORD',
      'PUBLIC_LIABILITY',
      'RENT_GUARANTEE',
      'COMMERCIAL_COMBINED',
      'OTHER'
    )
    .required(),
  provider: Joi.string().allow('', null).optional(),
  policyNumber: Joi.string().allow('', null).optional(),
  coverAmount: Joi.number().min(0).allow(null).optional(),
  premium: Joi.number().min(0).allow(null).optional(),
  premiumFrequency: Joi.string().allow('', null).optional(),
  renewalDate: Joi.date().iso().allow(null).optional(),
  startDate: Joi.date().iso().allow(null).optional(),
  documentId: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
});

const utilitySchema = Joi.object({
  id: Joi.string().optional(),
  utilityType: Joi.string()
    .valid(
      'ELECTRICITY',
      'GAS',
      'WATER',
      'BROADBAND',
      'COUNCIL_TAX',
      'BUSINESS_RATES',
      'SEWER',
      'TRASH',
      'GENERATOR',
      'ESTATE_SECURITY',
      'OTHER'
    )
    .required(),
  supplier: Joi.string().allow('', null).optional(),
  accountNumber: Joi.string().allow('', null).optional(),
  meterNumber: Joi.string().allow('', null).optional(),
  paidBy: Joi.string()
    .valid('LANDLORD', 'TENANT', 'INCLUDED_IN_RENT', 'SHARED')
    .optional(),
  annualEstimate: Joi.number().min(0).allow(null).optional(),
  notes: Joi.string().allow('', null).optional(),
});

const ownershipSchema = Joi.object({
  ownerEntityType: Joi.string()
    .valid('INDIVIDUAL', 'LIMITED_COMPANY', 'TRUST', 'PARTNERSHIP', 'SPV', 'OTHER')
    .allow(null)
    .optional(),
  ownerEntityName: Joi.string().allow('', null).optional(),
  acquisitionDate: Joi.date().iso().allow(null).optional(),
  acquisitionCost: Joi.number().min(0).allow(null).optional(),
  mortgageLender: Joi.string().allow('', null).optional(),
  mortgageAccountRef: Joi.string().allow('', null).optional(),
  titleReference: Joi.string().allow('', null).optional(),
  taxReference: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
}).optional();

export const upsertOperationalProfileSchema = Joi.object({
  complianceRecords: Joi.array().items(complianceRecordSchema).optional(),
  insurancePolicies: Joi.array().items(insuranceSchema).optional(),
  utilityAccounts: Joi.array().items(utilitySchema).optional(),
  ownershipProfile: ownershipSchema,
});
