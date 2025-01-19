"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.tenantSchema = joi_1.default.object({
    no: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
    agentId: joi_1.default.string().allow(null),
    propertyId: joi_1.default.string().required(),
    phoneNumber: joi_1.default.string().required(),
    apartmentOrFlatNumber: joi_1.default.string().optional(),
    // Using Joi.date().required() for date fields
    dateOfFirstRent: joi_1.default.date().required().messages({
        'date.base': 'Date of first rent must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    leaseStartDate: joi_1.default.date().required().messages({
        'date.base': 'Lease start date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    leaseEndDate: joi_1.default.date().required().messages({
        'date.base': 'Lease end date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    dateOfBirth: joi_1.default.date().required().messages({
        'date.base': 'Date of birth must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    rentstatus: joi_1.default.number().integer().valid(0, 1).required(),
    isCurrentLease: joi_1.default.boolean().required(),
    gender: joi_1.default.string().valid('Male', 'Female', 'Other').required(),
    address: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    maritalStatus: joi_1.default.string().valid('Single', 'Married', 'Divorced', 'Widowed').required(),
    middleName: joi_1.default.string().optional(),
    firstName: joi_1.default.string().required(),
    lastName: joi_1.default.string().required(),
    zip: joi_1.default.string().pattern(/^\d+$/).required(),
    unit: joi_1.default.string().required(),
    timeZone: joi_1.default.string().required(),
    taxPayerId: joi_1.default.string().required(),
    taxType: joi_1.default.string().required(),
    title: joi_1.default.string().required(),
    invited: joi_1.default.string().valid("YES", "NO").optional(),
    nationality: joi_1.default.string().required(),
    identificationType: joi_1.default.string().required(),
    issuingAuthority: joi_1.default.string().required(),
    expiryDate: joi_1.default.date().required().messages({
        'date.base': 'Expiry date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    // Guarantor Information
    guarantorId: joi_1.default.string().optional(),
    guarantorFullname: joi_1.default.string().required(),
    guarantorPhoneNumber: joi_1.default.string().required(),
    guarantorEmail: joi_1.default.string().required(),
    guarantorAddress: joi_1.default.string().required(),
    relationshipToGuarantor: joi_1.default.string().required(),
    gauratorIdentificationType: joi_1.default.string().required(),
    gauratorIdentificationNo: joi_1.default.string().required(),
    gauratorMonthlyIncome: joi_1.default.string().required(),
    gauratorEmployerName: joi_1.default.string().required(),
    // Next of Kin Information
    nextOfKinLastName: joi_1.default.string().required(),
    nextOfKinFirstName: joi_1.default.string().required(),
    nextOfKinMiddleName: joi_1.default.string().optional(),
    nextOfKinEmail: joi_1.default.string().optional(),
    relationship: joi_1.default.string().required(),
    nextOfKinPhoneNumber: joi_1.default.string().required(),
    // Employment Information
    employmentStatus: joi_1.default.string().required(),
    taxCredit: joi_1.default.string().required(),
    employmentZipCode: joi_1.default.string().required(),
    employmentAddress: joi_1.default.string().required(),
    employmentCity: joi_1.default.string().required(),
    employmentState: joi_1.default.string().required(),
    employmentCountry: joi_1.default.string().required(),
    employmentStartDate: joi_1.default.date().required().messages({
        'date.base': 'Employment start date must be a valid date in ISO 8601 format (YYYY-MM-DD).',
    }),
    monthlyOrAnualIncome: joi_1.default.string().required(),
    childBenefit: joi_1.default.string().required(),
    childMaintenance: joi_1.default.string().required(),
    disabilityBenefit: joi_1.default.string().required(),
    housingBenefit: joi_1.default.string().required(),
    others: joi_1.default.string().required(),
    pension: joi_1.default.string().required(),
    moreDetails: joi_1.default.string().optional(),
    employerCompany: joi_1.default.string().required(),
    employerEmail: joi_1.default.string().required(),
    employerPhone: joi_1.default.string().required(),
    positionTitle: joi_1.default.string().optional(),
    // Emergency Information
    emergencyInfoId: joi_1.default.string().optional(),
    emergencyPhoneNumber: joi_1.default.string().optional(),
    emergencyEmail: joi_1.default.string().optional(),
    emergencyAddress: joi_1.default.string().optional(),
    // Referees Information
    refereeId: joi_1.default.string().optional(),
    refereeProfessionalReferenceName: joi_1.default.string().required(),
    refereePersonalReferenceName: joi_1.default.string().required(),
    refereePersonalEmail: joi_1.default.string().required(),
    refereeProfessionalEmail: joi_1.default.string().required(),
    refereePersonalPhoneNumber: joi_1.default.string().required(),
    refereeProfessionalPhoneNumber: joi_1.default.string().required(),
    refereePersonalRelationship: joi_1.default.string().required(),
    refereeProfessionalRelationship: joi_1.default.string().required(),
    // Application Questions
    havePet: joi_1.default.string().valid('YES', 'NO').required(),
    youSmoke: joi_1.default.string().valid('YES', 'NO').required(),
    requireParking: joi_1.default.string().valid('YES', 'NO').required(),
    haveOutstandingDebts: joi_1.default.string().valid('YES', 'NO').required(),
});
