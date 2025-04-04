"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationUpdateSchema = exports.employeeReferenceSchema = exports.GuarantorAgreementCreateSchema = exports.documentCreateSchema = exports.GuarantorEmploymentInfoCreateSchema = exports.LandlordReferenceFormCreateSchema = exports.TenantConductCreateSchema = exports.TenancyReferenceHistoryCreateSchema = exports.ExternalLandlordUpdateSchema = exports.ExternalLandlordCreateSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
var EmploymentType;
(function (EmploymentType) {
    EmploymentType["EMPLOYED"] = "EMPLOYED";
    EmploymentType["SELF_EMPLOYED"] = "SELF_EMPLOYED";
    EmploymentType["FREELANCE"] = "FREELANCE";
    EmploymentType["DIRECTOR"] = "DIRECTOR";
    EmploymentType["SOLE_PROPRIETOR"] = "SOLE_PROPRIETOR";
})(EmploymentType || (EmploymentType = {}));
// Base schemas with common configurations
const requiredString = (label) => joi_1.default.string().required().label(label);
const optionalString = (label) => joi_1.default.string().optional().label(label);
const requiredDate = (label) => joi_1.default.date().required().label(label);
const optionalDate = (label) => joi_1.default.date().optional().label(label);
exports.ExternalLandlordCreateSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    contactNumber: joi_1.default.string().required(),
    emailAddress: joi_1.default.string().email().required(),
});
exports.ExternalLandlordUpdateSchema = joi_1.default.object({
    name: requiredString('Name'),
    contactNumber: requiredString('Contact Number')
        .pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/),
    emailAddress: requiredString('Email Address').email(),
});
exports.TenancyReferenceHistoryCreateSchema = joi_1.default.object({
    tenantName: requiredString('Full Name'),
    currentAddress: requiredString('Property Address'),
    rentAmount: requiredString('Rent Amount')
        .pattern(/^\d+(\.\d{1,2})?$/),
    rentStartDate: optionalDate('Tenancy Start Date'),
    rentEndDate: optionalDate('Tenancy End Date'),
    reasonForLeaving: optionalString('Reason for Leaving'),
});
exports.TenantConductCreateSchema = joi_1.default.object({
    rentOnTime: joi_1.default.boolean().optional().label('Rent Paid On Time'),
    rentOnTimeDetails: optionalString('Rent On Time Details'),
    rentArrears: joi_1.default.boolean().optional().label('Rent Arrears'),
    rentArrearsDetails: optionalString('Rent Arrears Details'),
    propertyCondition: joi_1.default.boolean().optional().label('Property Condition'),
    propertyConditionDetails: optionalString('Property Condition Details'),
    complaints: joi_1.default.boolean().optional().label('Complaints'),
    complaintsDetails: optionalString('Complaints Details'),
    endCondition: joi_1.default.boolean().optional().label('End Condition'),
    endConditionDetails: optionalString('End Condition Details'),
    rentAgain: joi_1.default.boolean().optional().label('Would Rent Again'),
    rentAgainDetails: optionalString('Would Rent Again Details'),
});
// reference.schema.ts
exports.LandlordReferenceFormCreateSchema = joi_1.default.object({
    status: joi_1.default.string()
        .valid(...Object.values(client_1.ReferenceStatus))
        .default(client_1.ReferenceStatus.PENDING)
        .label('Reference Status'),
    additionalComments: optionalString('Additional Comments'),
    signerName: optionalString('Signer Name'),
    signature: optionalString('Signature'),
    tenancyHistory: exports.TenancyReferenceHistoryCreateSchema.required()
        .label('Tenancy History'),
    externalLandlord: exports.ExternalLandlordCreateSchema.required()
        .label('External Landlord'),
    conduct: exports.TenantConductCreateSchema.required()
        .label('Tenant Conduct'),
})
    .options({ abortEarly: false }) // Return all validation errors
    .label('Landlord Reference Form');
exports.GuarantorEmploymentInfoCreateSchema = joi_1.default.object({
    employmentType: joi_1.default.string()
        .valid(...Object.values(EmploymentType))
        .required()
        .label('Employment Type'),
    // Common fields
    annualIncome: joi_1.default.number().precision(2).optional(),
    // Employed
    employerName: joi_1.default.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    jobTitle: joi_1.default.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    employmentStartDate: joi_1.default.date().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    employerAddress: joi_1.default.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    employerPhone: joi_1.default.string()
        .pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/)
        .when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    employerEmail: joi_1.default.string().email().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: joi_1.default.required(),
    }),
    // Self-Employed
    businessName: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: joi_1.default.required(),
    }),
    businessNature: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: joi_1.default.required(),
    }),
    yearsInBusiness: joi_1.default.number().integer().min(0).when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: joi_1.default.required(),
    }),
    businessAddress: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: joi_1.default.required(),
    }),
    accountantName: joi_1.default.string().optional(),
    accountantContact: joi_1.default.string().optional(),
    utrNumber: joi_1.default.string().pattern(/^\d{10}$/).optional(),
    // Freelance
    freelanceType: joi_1.default.string().when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: joi_1.default.required(),
    }),
    yearsFreelancing: joi_1.default.number().integer().min(0).when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: joi_1.default.required(),
    }),
    freelanceMonthlyIncome: joi_1.default.number().precision(2).when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: joi_1.default.required(),
    }),
    freelanceUtrNumber: joi_1.default.number().precision(2).when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: joi_1.default.required(),
    }),
    freelancePortfolioWebsite: joi_1.default.string().uri().optional(),
    freelanceMajorClients: joi_1.default.string().optional(),
    // Director
    companyName: joi_1.default.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    companyNumber: joi_1.default.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    position: joi_1.default.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    ownershipPercentage: joi_1.default.number().integer().min(0).max(100).when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    directorIncome: joi_1.default.number().integer().min(0).max(100).when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    companyFounded: joi_1.default.number().integer().min(1900).max(new Date().getFullYear()).when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    companyAddress: joi_1.default.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: joi_1.default.required(),
    }),
    // Sole Proprietor (New Section)
    businessNameSole: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    businessNatureSole: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    businessYearsSole: joi_1.default.number().integer().min(0).when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    annualIncomeSole: joi_1.default.number().precision(2).when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    businessAddressSole: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    businessRegistration: joi_1.default.string().when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: joi_1.default.required(),
    }),
    utrNumberSole: joi_1.default.string().pattern(/^\d{10}$/).optional(),
}).options({ stripUnknown: true });
exports.documentCreateSchema = joi_1.default.object({
    documentName: joi_1.default.string().required(),
    documentUrl: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    size: joi_1.default.string().required(),
    idType: joi_1.default.string().valid(...Object.values(client_1.IdType)).optional(),
    docType: joi_1.default.string().valid(...Object.values(client_1.DocumentType)).optional()
});
exports.GuarantorAgreementCreateSchema = joi_1.default.object({
    status: joi_1.default.string().valid(...Object.values(client_1.ReferenceStatus))
        .default(client_1.ReferenceStatus.PENDING),
    documents: joi_1.default.array().items(exports.documentCreateSchema).required(),
    // agreementText: Joi.string().required(),
    title: joi_1.default.string().required(),
    firstName: joi_1.default.string().required(),
    lastName: joi_1.default.string().required(),
    middleName: joi_1.default.string().required(),
    dateOfBirth: joi_1.default.string().required(),
    contactNumber: joi_1.default.string().required(),
    emailAddress: joi_1.default.string().required(),
    nationalInsuranceNumber: joi_1.default.string().required(),
    signedByGuarantor: joi_1.default.boolean().required(),
    guarantorSignature: joi_1.default.string().required(),
    guarantorSignedAt: joi_1.default.date().required(),
    guarantorEmployment: exports.GuarantorEmploymentInfoCreateSchema,
    // applicationId: Joi.string().required(),
});
exports.employeeReferenceSchema = joi_1.default.object({
    employeeName: joi_1.default.string().required(),
    jobTitle: joi_1.default.string().optional(),
    department: joi_1.default.string().optional(),
    employmentStartDate: joi_1.default.date().optional(),
    employmentEndDate: joi_1.default.date().optional(),
    reasonForLeaving: joi_1.default.string().optional(),
    companyName: joi_1.default.string().optional(),
    refereeName: joi_1.default.string().optional(),
    refereePosition: joi_1.default.string().optional(),
    contactNumber: joi_1.default.string().optional(),
    emailAddress: joi_1.default.string().email().optional(),
    employmentType: joi_1.default.string().optional(),
    mainResponsibilities: joi_1.default.string().optional(),
    workPerformance: joi_1.default.number().integer().min(0).max(5).optional(),
    punctualityAttendance: joi_1.default.number().integer().min(0).max(5).optional(),
    reliabilityProfessionalism: joi_1.default.number().integer().min(0).max(5).optional(),
    teamworkInterpersonal: joi_1.default.number().integer().min(0).max(5).optional(),
    wouldReemploy: joi_1.default.boolean().optional(),
    reemployDetails: joi_1.default.string().optional(),
    additionalComments: joi_1.default.string().optional(),
    declarationConfirmed: joi_1.default.boolean().default(true),
    signerName: joi_1.default.string().optional(),
    signature: joi_1.default.string().optional(),
    date: joi_1.default.date().required()
}).options({ abortEarly: false });
exports.VerificationUpdateSchema = joi_1.default.object({
    employmentVerificationStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required(),
    incomeVerificationStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required(),
    creditCheckStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required(),
    landlordVerificationStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required(),
    guarantorVerificationStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required(),
    refereeVerificationStatus: joi_1.default.string().valid(...Object.values(client_1.YesNo)).required()
});
