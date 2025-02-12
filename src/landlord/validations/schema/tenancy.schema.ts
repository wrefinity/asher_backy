import Joi from 'joi';

export const tenantSchema = Joi.object({
  no: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  agentId: Joi.string().allow(null),
  propertyId: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  apartmentOrFlatNumber: Joi.string().optional(),
  initialDeposit: Joi.number().optional(), 
  // Using Joi.date().required() for date fields
  dateOfFirstRent: Joi.date().required().messages({
    'date.base': 'Date of first rent must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),
  leaseStartDate: Joi.date().required().messages({
    'date.base': 'Lease start date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),
  leaseEndDate: Joi.date().required().messages({
    'date.base': 'Lease end date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),
  dateOfBirth: Joi.date().required().messages({
    'date.base': 'Date of birth must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),

  rentstatus: Joi.number().integer().valid(0, 1).required(),
  isCurrentLease: Joi.boolean().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  address: Joi.string().required(),
  country: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  maritalStatus: Joi.string().valid('Single', 'Married', 'Divorced', 'Widowed').required(),
  middleName: Joi.string().optional(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  
  zip: Joi.string().pattern(/^\d+$/).required(),
  unit: Joi.string().required(),
  timeZone: Joi.string().required(),
  taxPayerId: Joi.string().required(),
  taxType: Joi.string().required(),
  title: Joi.string().required(),
  invited: Joi.string().valid("YES","NO").optional(),

  nationality: Joi.string().required(),
  identificationType: Joi.string().required(),
  issuingAuthority: Joi.string().required(),
  expiryDate: Joi.date().required().messages({
    'date.base': 'Expiry date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),

  // Guarantor Information
  guarantorId: Joi.string().optional(),
  guarantorFullname: Joi.string().required(),
  guarantorPhoneNumber: Joi.string().required(),
  guarantorEmail: Joi.string().required(),
  guarantorAddress: Joi.string().required(),
  relationshipToGuarantor: Joi.string().required(),
  gauratorIdentificationType: Joi.string().required(),
  gauratorIdentificationNo: Joi.string().required(),
  gauratorMonthlyIncome: Joi.string().required(),
  gauratorEmployerName: Joi.string().required(),

  // Next of Kin Information
  nextOfKinLastName: Joi.string().required(),
  nextOfKinFirstName: Joi.string().required(),
  nextOfKinMiddleName: Joi.string().optional(),
  nextOfKinEmail: Joi.string().optional(),
  relationship: Joi.string().required(),
  nextOfKinPhoneNumber: Joi.string().required(),

  // Employment Information
  employmentStatus: Joi.string().required(),
  taxCredit: Joi.string().required(),
  employmentZipCode: Joi.string().required(),
  employmentAddress: Joi.string().required(),
  employmentCity: Joi.string().required(),
  employmentState: Joi.string().required(),
  employmentCountry: Joi.string().required(),
  employmentStartDate: Joi.date().required().messages({
    'date.base': 'Employment start date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
  }),

  monthlyOrAnualIncome: Joi.string().required(),
  childBenefit: Joi.string().required(),
  childMaintenance: Joi.string().required(),
  disabilityBenefit: Joi.string().required(),
  housingBenefit: Joi.string().required(),
  others: Joi.string().required(),
  pension: Joi.string().required(),
  moreDetails: Joi.string().optional(),
  employerCompany: Joi.string().required(),
  employerEmail: Joi.string().required(),
  employerPhone: Joi.string().required(),
  positionTitle: Joi.string().optional(),

  // Emergency Information
  emergencyInfoId:Joi.string().optional(), 
  emergencyPhoneNumber: Joi.string().optional(),
  emergencyEmail: Joi.string().optional(),
  emergencyAddress: Joi.string().optional(),

  // Referees Information
  refereeId: Joi.string().optional(),
  refereeProfessionalReferenceName: Joi.string().required(),
  refereePersonalReferenceName: Joi.string().required(),
  refereePersonalEmail: Joi.string().required(),
  refereeProfessionalEmail: Joi.string().required(),
  refereePersonalPhoneNumber: Joi.string().required(),
  refereeProfessionalPhoneNumber: Joi.string().required(),
  refereePersonalRelationship: Joi.string().required(),
  refereeProfessionalRelationship: Joi.string().required(),

  // Application Questions
  havePet: Joi.string().valid('YES', 'NO').required(),
  youSmoke: Joi.string().valid('YES', 'NO').required(),
  requireParking: Joi.string().valid('YES', 'NO').required(),
  haveOutstandingDebts: Joi.string().valid('YES', 'NO').required(),
});
