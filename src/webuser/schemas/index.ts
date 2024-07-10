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
    dob: Joi.date().required(),
    email: Joi.string().email().optional(), // Optional as per interface definition
    phoneNumber: Joi.string().required(),
    maritalStatus: Joi.string().required(),
    nextOfKin: nextOfKinSchema.allow(null).optional(), // Validate nextOfKin using the previous schema
  });

// Guarantor Information Schema
const guarantorInformationSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    fullName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    applicationId: Joi.string().required(),
});

// Emergency Contact Schema
const emergencyContactSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    fullname: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    address: Joi.string().required(),
    applicationId: Joi.string().required(),
});


const documentSchema = Joi.object({
    id: Joi.string().allow(null).optional(),
    documentName: Joi.string().required(),
    // documentUrl: Joi.string().optional(),
    cloudinaryUrls: Joi.string().optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional(),
    applicantId: Joi.string().required(),
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
    lengthOfResidence: Joi.string().required(),
    landlordOrAgencyPhoneNumber: Joi.string().required(),
    landlordOrAgencyEmail: Joi.string().email().required(),
    landlordOrAgencyName: Joi.string().required(),
    userId: Joi.string().allow(null).optional(),
    prevAddresses: Joi.array().items(prevAddressSchema).required(),
    applicationId: Joi.string().allow(null).optional(),
});

const employmentInformationSchema = Joi.object({
    id: Joi.string().optional().allow(null),
    employmentStatus: Joi.string().required(),
    taxCredit: Joi.string().optional().allow(null),
    childBenefit: Joi.string().optional().allow(null),
    childMaintenance: Joi.string().optional().allow(null),
    disabilityBenefit: Joi.string().optional().allow(null),
    housingBenefit: Joi.string().optional().allow(null),
    others: Joi.string().optional().allow(null),
    pension: Joi.string().optional().allow(null),
    moreDetails: Joi.string().optional().allow(null),
    applicantId: Joi.string().required(),
  });

export {
    nextOfKinSchema,
    applicantPersonalDetailsSchema,
    employmentInformationSchema,
    guarantorInformationSchema,
    emergencyContactSchema,
    documentSchema,
    prevAddressSchema,
    residentialInformationSchema
};
