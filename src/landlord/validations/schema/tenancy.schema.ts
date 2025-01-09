const Joi = require('joi');

export const tenantSchema = Joi.object({
    no: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    agentId: Joi.string().allow(null),
    propertyId: Joi.string().required(),
    apartmentOrFlatNumber: Joi.string().optional(),
    dateOfFirstRent: Joi.date().required(),
    leaseStartDate: Joi.date().required(),
    leaseEndDate: Joi.date().required(),
    dateOfBirth: Joi.date().required(),
    // dateOfFirstRent: Joi.date().iso().required(),
    rentstatus: Joi.number().integer().valid(0, 1).required(),
    isCurrentLease: Joi.boolean().required(),
    gender: Joi.string().valid('Male', 'Female', 'Other').required(),
    // phoneNumber: Joi.string().pattern(/^\d+$/).required(),
    address: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    maritalStatus: Joi.string().valid('Single', 'Married', 'Divorced', 'Widowed').required(),
    fullname: Joi.string().required(),
    zip: Joi.string().pattern(/^\d+$/).required(),
    unit: Joi.string().required(),
    timeZone: Joi.string().required(),
    taxPayerId: Joi.string().required(),
    taxType: Joi.string().required(),
    title: Joi.string().required(),

    
});
