
import Joi from 'joi';
import { ReferenceStatus, EmploymentType } from "@prisma/client"

// Base schemas with common configurations
const requiredString = (label: string) => Joi.string().required().label(label);
const optionalString = (label: string) => Joi.string().optional().label(label);
const requiredDate = (label: string) => Joi.date().required().label(label);
const optionalDate = (label: string) => Joi.date().optional().label(label);

export const ExternalLandlordCreateSchema = Joi.object({
    name: Joi.string().required(),
    contactNumber: Joi.string().required(),
    emailAddress: Joi.string().email().required(),
});

export const ExternalLandlordUpdateSchema = Joi.object({
    name: requiredString('Name'),
    contactNumber: requiredString('Contact Number')
      .pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/),
    emailAddress: requiredString('Email Address').email(),
});


export const TenancyReferenceHistoryCreateSchema = Joi.object({
    fullName: requiredString('Full Name'),
    propertyAddress: requiredString('Property Address'),
    rentAmount: requiredString('Rent Amount')
      .pattern(/^\d+(\.\d{1,2})?$/),
    tenancyStartDate: optionalDate('Tenancy Start Date'),
    tenancyEndDate: optionalDate('Tenancy End Date'),
    reasonForLeaving: optionalString('Reason for Leaving'),
});

export const TenantConductCreateSchema = Joi.object({
    rentOnTime: Joi.boolean().optional().label('Rent Paid On Time'),
    rentOnTimeDetails: optionalString('Rent On Time Details'),
    rentArrears: Joi.boolean().optional().label('Rent Arrears'),
    rentArrearsDetails: optionalString('Rent Arrears Details'),
    propertyCondition: Joi.boolean().optional().label('Property Condition'),
    propertyConditionDetails: optionalString('Property Condition Details'),
    complaints: Joi.boolean().optional().label('Complaints'),
    complaintsDetails: optionalString('Complaints Details'),
    endCondition: Joi.boolean().optional().label('End Condition'),
    endConditionDetails: optionalString('End Condition Details'),
    rentAgain: Joi.boolean().optional().label('Would Rent Again'),
    rentAgainDetails: optionalString('Would Rent Again Details'),
});

// reference.schema.ts
export const LandlordReferenceFormCreateSchema = Joi.object({
    status: Joi.string()
      .valid(...Object.values(ReferenceStatus))
      .default(ReferenceStatus.PENDING)
      .label('Reference Status'),
    additionalComments: optionalString('Additional Comments'),
    signerName: optionalString('Signer Name'),
    signature: optionalString('Signature'),
    tenancyHistory: TenancyReferenceHistoryCreateSchema.required()
      .label('Tenancy History'),
    externalLandlord: ExternalLandlordCreateSchema.required()
      .label('External Landlord'),
    conduct: TenantConductCreateSchema.required()
      .label('Tenant Conduct'),
  })
    .options({ abortEarly: false }) // Return all validation errors
    .label('Landlord Reference Form');


export const GuarantorEmploymentInfoCreateSchema = Joi.object({
    employmentType: Joi.string()
        .valid(...Object.values(EmploymentType))
        .required()
        .label('Employment Type'),

    // Common fields
    annualIncome: Joi.number().precision(2).optional(),

    // Employed fields
    employerName: Joi.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: Joi.required(),
    }),
    jobTitle: Joi.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: Joi.required(),
    }),
    employmentStartDate: Joi.date().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: Joi.required(),
    }),
    employerAddress: Joi.string().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: Joi.required(),
    }),
    employerPhone: Joi.string()
        .pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/)
        .when('employmentType', {
            is: EmploymentType.EMPLOYED,
            then: Joi.required(),
        }),
    employerEmail: Joi.string().email().when('employmentType', {
        is: EmploymentType.EMPLOYED,
        then: Joi.required(),
    }),

    // Self-Employed fields
    businessName: Joi.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: Joi.required(),
    }),
    businessNature: Joi.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: Joi.required(),
    }),
    yearsInBusiness: Joi.number().integer().min(0).when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: Joi.required(),
    }),
    businessAddress: Joi.string().when('employmentType', {
        is: EmploymentType.SELF_EMPLOYED,
        then: Joi.required(),
    }),
    accountantName: Joi.string().optional(),
    accountantContact: Joi.string().optional(),
    utrNumber: Joi.string().pattern(/^\d{10}$/).optional(),

    // Freelance fields
    freelanceType: Joi.string().when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: Joi.required(),
    }),
    yearsFreelancing: Joi.number().integer().min(0).when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: Joi.required(),
    }),
    monthlyIncome: Joi.number().precision(2).when('employmentType', {
        is: EmploymentType.FREELANCE,
        then: Joi.required(),
    }),
    portfolioWebsite: Joi.string().uri().optional(),
    majorClients: Joi.string().optional(),

    // Director fields
    companyName: Joi.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),
    companyNumber: Joi.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),
    position: Joi.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),
    ownershipPercentage: Joi.number().integer().min(0).max(100).when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),
    companyFounded: Joi.number().integer().min(1900).max(new Date().getFullYear()).when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),
    companyAddress: Joi.string().when('employmentType', {
        is: EmploymentType.DIRECTOR,
        then: Joi.required(),
    }),

    // Sole Proprietor fields
    businessRegistrationNumber: Joi.string().when('employmentType', {
        is: EmploymentType.SOLE_PROPRIETOR,
        then: Joi.required(),
    }),
}).options({ stripUnknown: true });

export const GuarantorAgreementCreateSchema = Joi.object({
    status: Joi.string().valid(...Object.values(ReferenceStatus))
    .default(ReferenceStatus.PENDING),
    agreementText: Joi.string().required(),
    guarantorId: Joi.string().required(),
    guarantorEmployment: GuarantorEmploymentInfoCreateSchema,
    applicationId: Joi.string().required(),
});


export const employeeReferenceSchema = Joi.object({
  employeeName: Joi.string().required(),
  jobTitle: Joi.string().optional(),
  department: Joi.string().optional(),
  employmentStartDate: Joi.date().optional(),
  employmentEndDate: Joi.date().optional(),
  reasonForLeaving: Joi.string().optional(),
  companyName: Joi.string().optional(),
  refereeName: Joi.string().optional(),
  refereePosition: Joi.string().optional(),
  contactNumber: Joi.string().optional(),
  emailAddress: Joi.string().email().optional(),
  employmentType: Joi.string().optional(),
  mainResponsibilities: Joi.string().optional(),
  workPerformance: Joi.number().integer().min(0).max(5).optional(),
  punctualityAttendance: Joi.number().integer().min(0).max(5).optional(),
  reliabilityProfessionalism: Joi.number().integer().min(0).max(5).optional(),
  teamworkInterpersonal: Joi.number().integer().min(0).max(5).optional(),
  wouldReemploy: Joi.boolean().optional(),
  reemployDetails: Joi.string().optional(),
  additionalComments: Joi.string().optional(),
  declarationConfirmed: Joi.boolean().default(true),
  signerName: Joi.string().optional(),
  signature: Joi.string().optional(),
  date: Joi.date().required()
}).options({ abortEarly: false });