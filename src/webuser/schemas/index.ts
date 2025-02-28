import Joi from 'joi';

const nextOfKinSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    relationship: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    middleName: Joi.string().allow(null).optional(),
});

const applicantPersonalDetailsSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    middleName: Joi.string().allow(null).optional(),
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

// Guarantor Information Schema
const guarantorInformationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    fullName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    applicationId: Joi.string().optional(),
    relationship: Joi.string().required(),
    identificationType: Joi.string().required(),
    identificationNo: Joi.string().required(),
    monthlyIncome: Joi.string().required(),
    employerName: Joi.string().required(),
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
    additionalNotes: Joi.string().optional(),
    date: Joi.date().iso().required(),
    cloudinaryUrls: Joi.any().optional(),
    cloudinaryVideoUrls: Joi.any().optional(),
    cloudinaryAudioUrls: Joi.any().optional(),
    cloudinaryDocumentUrls: Joi.any().optional(),
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
    additionalInformation: Joi.string().optional(),
});


const prevAddressSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    address: Joi.string().required(),
    lengthOfResidence: Joi.string().required(),
});

const residentialInformationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    address: Joi.string().required(),
    addressStatus: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    zipCode: Joi.string().required(),
    lengthOfResidence: Joi.string().valid("Years", "Months").required(),
    landlordOrAgencyPhoneNumber: Joi.string().required(),
    landlordOrAgencyEmail: Joi.string().email().required(),
    landlordOrAgencyName: Joi.string().required(),
    reasonForLeaving: Joi.string().optional(),
    userId: Joi.string().allow(null).optional(),
    prevAddresses: Joi.array().items(prevAddressSchema).required(),
    applicationId: Joi.string().allow(null).optional(),
});



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
    taxCredit: Joi.string().optional().allow(null),
    childBenefit: Joi.string().optional().allow(null),
    childMaintenance: Joi.string().optional().allow(null),
    disabilityBenefit: Joi.string().optional().allow(null),
    housingBenefit: Joi.string().optional().allow(null),
    others: Joi.string().optional().allow(null),
    pension: Joi.string().optional().allow(null),
    moreDetails: Joi.string().optional().allow(null),
    applicantId: Joi.string().optional(),
    employerCompany: Joi.string().optional(),
    employerEmail: Joi.string().optional(),
    employerPhone: Joi.string().optional(),
    positionTitle: Joi.string().optional()
});

export {
    nextOfKinSchema,
    applicantPersonalDetailsSchema,
    employmentInformationSchema,
    guarantorInformationSchema,
    emergencyContactSchema,
    documentSchema,
    prevAddressSchema,
    refreeSchema,
    additionalInfoSchema,
    declarationSchema,
    residentialInformationSchema
};
