import Joi from "joi";

const adSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    currency: Joi.string().required(),
    startedDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startedDate')).required(),
    locations: Joi.array().items(Joi.string()).optional(),
    bussinessDetails: Joi.object({
        bussinessName: Joi.string().required(),
        bussinessDescription: Joi.string().required(),
        bussinessWebsite: Joi.string().uri().optional(),
        bussinessEmail: Joi.string().email().optional(),
        bussinessPhone: Joi.string().optional()
    }),
    contactInfo: Joi.string().optional(),
    amountPaid: Joi.number().positive().optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),

})

export { adSchema };