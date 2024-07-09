import Joi from 'joi';

const residentialInformationSchema = Joi.object({
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  postalCode: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).required(),
  country: Joi.string().required(),
  moveInDate: Joi.date().iso().required(),
  moveOutDate: Joi.date().iso().optional(),
});

const guarantorInformationSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  email: Joi.string().email().required(),
  relationship: Joi.string().required(),
});

const emergencyContactSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  email: Joi.string().email().optional(),
  relationship: Joi.string().required(),
});

const documentSchema = Joi.object({
  documentType: Joi.string().required(),
//   documentUrl: Joi.string().uri().required(),
  cloudinaryUrls: Joi.string().uri().required(), // replacing the documentUrl
  uploadedAt: Joi.date().iso().required(),
});

const employmentInformationSchema = Joi.object({
  employerName: Joi.string().required(),
  jobTitle: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().optional(),
  salary: Joi.number().precision(2).required(),
  supervisorName: Joi.string().optional(),
  supervisorPhone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
});

const nextOfKinSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  relationship: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  email: Joi.string().email().optional(),
});

const applicantSchema = Joi.object({
  title: Joi.string().optional(),
  firstName: Joi.string().required(),
  middleName: Joi.string().optional(),
  lastName: Joi.string().required(),
  dob: Joi.date().iso().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  maritalStatus: Joi.string().required(),
  leaseStartDate: Joi.date().iso().required(),
  leaseEndDate: Joi.date().iso().required(),
  moveInDate: Joi.date().iso().required(),
  rentAmount: Joi.number().precision(2).required(),
  securityDeposit: Joi.number().precision(2).required(),
  leaseTerm: Joi.string().required(),
//   userId: Joi.number().required(),
  residentialInformation: Joi.array().items(residentialInformationSchema).optional(),
  guarantorInformation: Joi.array().items(guarantorInformationSchema).optional(),
  emergencyContact: Joi.array().items(emergencyContactSchema).optional(),
  documents: Joi.array().items(documentSchema).optional(),
  employmentInformations: Joi.array().items(employmentInformationSchema).optional(),
  nextOfKin: Joi.array().items(nextOfKinSchema).optional()
});

export default applicantSchema;
