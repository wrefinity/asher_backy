"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.residentialInformationSchema = exports.declarationSchema = exports.additionalInfoSchema = exports.refreeSchema = exports.prevAddressSchema = exports.appDocumentSchema = exports.documentSchema = exports.emergencyContactSchema = exports.guarantorInformationSchema = exports.employmentInformationSchema = exports.applicantPersonalDetailsSchema = exports.nextOfKinSchema = void 0;
const client_1 = require(".prisma/client");
const joi_1 = __importDefault(require("joi"));
const nextOfKinSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    firstName: joi_1.default.string().required(),
    lastName: joi_1.default.string().required(),
    relationship: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    phoneNumber: joi_1.default.string().required(),
    middleName: joi_1.default.string().allow(null).optional(),
});
exports.nextOfKinSchema = nextOfKinSchema;
const applicantPersonalDetailsSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    applicationInviteId: joi_1.default.string().required(),
    title: joi_1.default.string().required(),
    firstName: joi_1.default.string().required(),
    middleName: joi_1.default.string().allow(null).optional(),
    lastName: joi_1.default.string().required(),
    dob: joi_1.default.date().iso().required(),
    invited: joi_1.default.string().valid('YES', 'NO').default('NO'),
    email: joi_1.default.string().email().optional(), // Optional as per interface definition
    phoneNumber: joi_1.default.string().required(),
    maritalStatus: joi_1.default.string().required(),
    nationality: joi_1.default.string().required(),
    identificationType: joi_1.default.string().required(),
    identificationNo: joi_1.default.string().required(),
    issuingAuthority: joi_1.default.string().required(),
    expiryDate: joi_1.default.date().iso().required(),
    nextOfKin: nextOfKinSchema.allow(null).optional(), // Validate nextOfKin using the previous schema
});
exports.applicantPersonalDetailsSchema = applicantPersonalDetailsSchema;
// Guarantor Information Schema
const guarantorInformationSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    fullName: joi_1.default.string().required(),
    phoneNumber: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    address: joi_1.default.string().required(),
    applicationId: joi_1.default.string().optional(),
    relationship: joi_1.default.string().required(),
    identificationType: joi_1.default.string().optional(),
    identificationNo: joi_1.default.string().optional(),
    monthlyIncome: joi_1.default.string().optional(),
    employerName: joi_1.default.string().required(),
});
exports.guarantorInformationSchema = guarantorInformationSchema;
// Emergency Contact Schema
const emergencyContactSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    fullname: joi_1.default.string().required(),
    phoneNumber: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    address: joi_1.default.string().required(),
    applicationId: joi_1.default.string().optional(),
});
exports.emergencyContactSchema = emergencyContactSchema;
// RefreeSchema Contact Schema
const refreeSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    professionalReferenceName: joi_1.default.string().required(),
    personalReferenceName: joi_1.default.string().required(),
    personalEmail: joi_1.default.string().email().required(),
    professionalEmail: joi_1.default.string().email().required(),
    personalPhoneNumber: joi_1.default.string().required(),
    professionalPhoneNumber: joi_1.default.string().required(),
    personalRelationship: joi_1.default.string().optional(),
    professionalRelationship: joi_1.default.string().optional(),
    applicationId: joi_1.default.string().optional(),
});
exports.refreeSchema = refreeSchema;
const declarationSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    declaration: joi_1.default.string().required(),
    // signature: Joi.string().required(),
    additionalNotes: joi_1.default.string().optional(),
    date: joi_1.default.date().iso().required(),
    cloudinaryUrls: joi_1.default.any().optional(),
    cloudinaryVideoUrls: joi_1.default.any().optional(),
    cloudinaryAudioUrls: joi_1.default.any().optional(),
    cloudinaryDocumentUrls: joi_1.default.any().optional(),
    createdAt: joi_1.default.date().iso().optional(),
    updatedAt: joi_1.default.date().iso().optional(),
    applicantId: joi_1.default.string().optional(),
});
exports.declarationSchema = declarationSchema;
const documentSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    documentName: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    size: joi_1.default.string().required(),
    // documentUrl: Joi.string().optional(),
    cloudinaryUrls: joi_1.default.any().optional(),
    cloudinaryVideoUrls: joi_1.default.any().optional(),
    cloudinaryAudioUrls: joi_1.default.any().optional(),
    cloudinaryDocumentUrls: joi_1.default.any().optional(),
    createdAt: joi_1.default.date().iso().optional(),
    updatedAt: joi_1.default.date().iso().optional(),
    applicantId: joi_1.default.string().optional(),
});
exports.documentSchema = documentSchema;
const appDocumentSchema = joi_1.default.object({
    // id: Joi.string().allow(null).optional(),
    documentName: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    size: joi_1.default.string().required(),
    IdType: joi_1.default.string().valid(...Object.keys(client_1.IdType)).optional(),
    docType: joi_1.default.string().valid(...Object.keys(client_1.DocumentType)).optional(),
});
exports.appDocumentSchema = appDocumentSchema;
const additionalInfoSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    havePet: joi_1.default.string().valid('YES', 'NO').default('NO'),
    youSmoke: joi_1.default.string().valid('YES', 'NO').default('NO'),
    requireParking: joi_1.default.string().valid('YES', 'NO').default('NO'),
    haveOutstandingDebts: joi_1.default.string().valid('YES', 'NO').default('NO'),
    additionalOccupants: joi_1.default.string().optional(),
    additionalInformation: joi_1.default.string().optional(),
});
exports.additionalInfoSchema = additionalInfoSchema;
const prevAddressSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    address: joi_1.default.string().required(),
    lengthOfResidence: joi_1.default.string().required(),
});
exports.prevAddressSchema = prevAddressSchema;
const residentialInformationSchema = joi_1.default.object({
    id: joi_1.default.string().allow(null).optional(),
    address: joi_1.default.string().required(),
    addressStatus: joi_1.default.string().required(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    zipCode: joi_1.default.string().required(),
    lengthOfResidence: joi_1.default.string().valid("Years", "Months").required(),
    landlordOrAgencyPhoneNumber: joi_1.default.string().required(),
    landlordOrAgencyEmail: joi_1.default.string().email().required(),
    landlordOrAgencyName: joi_1.default.string().required(),
    reasonForLeaving: joi_1.default.string().optional(),
    userId: joi_1.default.string().allow(null).optional(),
    prevAddresses: joi_1.default.array().items(prevAddressSchema).required(),
    applicationId: joi_1.default.string().allow(null).optional(),
});
exports.residentialInformationSchema = residentialInformationSchema;
const employmentInformationSchema = joi_1.default.object({
    id: joi_1.default.string().optional().allow(null),
    employmentStatus: joi_1.default.string().required(),
    zipCode: joi_1.default.string().required(),
    startDate: joi_1.default.date().iso().required(),
    address: joi_1.default.string().required(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    monthlyOrAnualIncome: joi_1.default.string().required(),
    taxCredit: joi_1.default.string().optional().allow(null),
    childBenefit: joi_1.default.string().optional().allow(null),
    childMaintenance: joi_1.default.string().optional().allow(null),
    disabilityBenefit: joi_1.default.string().optional().allow(null),
    housingBenefit: joi_1.default.string().optional().allow(null),
    others: joi_1.default.string().optional().allow(null),
    pension: joi_1.default.string().optional().allow(null),
    moreDetails: joi_1.default.string().optional().allow(null),
    applicantId: joi_1.default.string().optional(),
    employerCompany: joi_1.default.string().optional(),
    employerEmail: joi_1.default.string().optional(),
    employerPhone: joi_1.default.string().optional(),
    positionTitle: joi_1.default.string().optional()
});
exports.employmentInformationSchema = employmentInformationSchema;
