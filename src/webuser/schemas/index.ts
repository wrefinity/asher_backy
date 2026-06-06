import { DocumentType, IdType } from '.prisma/client';
import Joi from 'joi';

const nextOfKinSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    relationship: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    middleName: Joi.string().allow(null, '').optional(),
});

const applicantPersonalDetailsSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    applicationInviteId: Joi.string().required(),
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    middleName: Joi.string().allow(null, '').optional(),
    lastName: Joi.string().required(),
    dob: Joi.date().iso().required(),
    invited: Joi.string().valid(
        'YES',
        'NO'
    ).default('NO'),
    email: Joi.string().email().optional(), // Optional as per interface definition
    phoneNumber: Joi.string().required(),
    maritalStatus: Joi.string().required(),
    nationality: Joi.string().required(),
    identificationType: Joi.string().required(),
    identificationNo: Joi.string().required(),
    issuingAuthority: Joi.string().required(),
    expiryDate: Joi.date().iso().required(),
    nextOfKin: nextOfKinSchema.allow(null).optional(), // Validate nextOfKin using the previous schema
});

// Guarantor Information Schema — tenant supplies contact details only; guarantor completes the reference form
const optionalGuarantorString = Joi.string().optional().allow(null, '');

const guarantorInformationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    fullName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    relationship: Joi.string().required(),
    address: optionalGuarantorString,
    applicationId: Joi.string().optional(),
    identificationType: optionalGuarantorString,
    identificationNo: optionalGuarantorString,
    monthlyIncome: optionalGuarantorString,
    employerName: optionalGuarantorString,
});

// Emergency Contact Schema
const emergencyContactSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    fullname: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    applicationId: Joi.string().optional(),
});
// RefreeSchema Contact Schema
const refreeSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    professionalReferenceName: Joi.string().required(),
    personalReferenceName: Joi.string().required(),
    personalEmail: Joi.string().email().required(),
    professionalEmail: Joi.string().email().required(),
    personalPhoneNumber: Joi.string().required(),
    professionalPhoneNumber: Joi.string().required(),
    personalRelationship: Joi.string().optional(),
    professionalRelationship: Joi.string().optional(),
    applicationId: Joi.string().optional(),
});


const declarationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    declaration: Joi.string().required(),
    signature: Joi.string().trim().min(2).required(),
    additionalNotes: Joi.string().optional().allow(null, ''),
    date: Joi.date().iso().required(),
    createdAt: Joi.date().iso().optional(),
    updatedAt: Joi.date().iso().optional(),
    applicantId: Joi.string().optional(),
});
const documentSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    documentName: Joi.string().required(),
    type: Joi.string().required(),
    size: Joi.string().required(),
    // documentUrl: Joi.string().optional(),
    cloudinaryUrls: Joi.any().optional(),
    cloudinaryVideoUrls: Joi.any().optional(),
    cloudinaryAudioUrls: Joi.any().optional(),
    cloudinaryDocumentUrls: Joi.any().optional(),
    createdAt: Joi.date().iso().optional(),
    updatedAt: Joi.date().iso().optional(),
    applicantId: Joi.string().optional(),
});

const appDocumentSchema = Joi.object({
    // id: Joi.string().allow(null).optional(),
    documentName: Joi.string().required(),
    type: Joi.string().required(),
    size: Joi.string().required(),
    IdType: Joi.string().valid(...Object.keys(IdType)).optional(),
    docType: Joi.string().valid(...Object.keys(DocumentType)).optional(),
});


const additionalInfoSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    havePet: Joi.string().valid(
        'YES',
        'NO'
    ).default('NO'),
    youSmoke: Joi.string().valid(
        'YES',
        'NO'
    ).default('NO'),
    requireParking: Joi.string().valid(
        'YES',
        'NO'
    ).default('NO'),
    haveOutstandingDebts: Joi.string().valid(
        'YES',
        'NO'
    ).default('NO'),
    additionalOccupants: Joi.string().optional(),
    additionalInformation: Joi.string().optional().allow(''),
    moveInDate: Joi.date().iso().optional(),
});


const prevAddressSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    address: Joi.string().required(),
    lengthOfResidence: Joi.string()
      .pattern(/^\d+\s+(Years|Months)$/i)
      .required(),
});

const residentialInformationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    address: Joi.string().required(),
    addressStatus: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipCode: Joi.string().required(),
    lengthOfResidence: Joi.string()
      .pattern(/^\d+\s+(Years|Months)$/i)
      .required()
      .messages({
        'string.pattern.base':
          'Length of residence must include a number and unit (e.g. "3 Years")',
      }),
    landlordOrAgencyPhoneNumber: Joi.string().required(),
    landlordOrAgencyEmail: Joi.string().email().required(),
    landlordOrAgencyName: Joi.string().required(),
    reasonForLeaving: Joi.string().optional(),
    monthlyRentPaid: Joi.string().optional().allow(null, ''),
    userId: Joi.string().allow(null).optional(),
    prevAddresses: Joi.array().items(prevAddressSchema).required(),
    applicationId: Joi.string().allow(null).optional(),
});



const optionalEmploymentString = Joi.string().optional().allow(null, '');

const employmentInformationSchema = Joi.object({
    id: Joi.string().optional().allow(null),
    employmentStatus: Joi.string().required(),
    zipCode: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    monthlyOrAnualIncome: Joi.string().required(),
    taxCredit: optionalEmploymentString,
    childBenefit: optionalEmploymentString,
    childMaintenance: optionalEmploymentString,
    disabilityBenefit: optionalEmploymentString,
    housingBenefit: optionalEmploymentString,
    others: optionalEmploymentString,
    pension: optionalEmploymentString,
    moreDetails: optionalEmploymentString,
    applicantId: Joi.string().optional(),
    employerCompany: optionalEmploymentString,
    businessName: optionalEmploymentString,
    businessEmail: optionalEmploymentString,
    businessPhone: optionalEmploymentString,
    employerEmail: optionalEmploymentString,
    employerPhone: optionalEmploymentString,
    positionTitle: optionalEmploymentString,
});
// Schema for creating tenant with required personalInfo
export const tenantCreateSchema = Joi.object({
  personalInfo: applicantPersonalDetailsSchema.optional(),
  employmentInfo: employmentInformationSchema.optional(),
  nextOfKinInfo: nextOfKinSchema.optional(),
  guarantorInfo: guarantorInformationSchema.optional(),
  emergencyContactInfo: emergencyContactSchema.optional(),
  residentialInfo: residentialInformationSchema.optional()
//   applicationQuestions: additionalInfoSchema.optional(),
//   declarationInfo: declarationSchema.optional(),
//   refereeInfo: refreeSchema.optional(),
//   documents: Joi.array().items(documentSchema).optional()
}).or(
  'personalInfo',
  'employmentInfo',
  'nextOfKinInfo',
  'guarantorInfo',
  'emergencyContactInfo',
  'residentialInfo',
//   'applicationQuestions',
//   'declarationInfo',
//   'refereeInfo',
//   'documents'
);


export {
    nextOfKinSchema,
    applicantPersonalDetailsSchema,
    employmentInformationSchema,
    guarantorInformationSchema,
    emergencyContactSchema,
    documentSchema,
    appDocumentSchema,
    prevAddressSchema,
    refreeSchema,
    additionalInfoSchema,
    declarationSchema,
    residentialInformationSchema
};
