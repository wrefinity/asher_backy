import Joi from "joi";

const adSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    locations: Joi.array().items(Joi.string()).optional(),
    bussinessDetails: Joi.object({
        bussinessName: Joi.string().required(),
        bussinessDescription: Joi.string().required(),
        bussinessWebsite: Joi.string().uri().optional(),
        bussinessEmail: Joi.string().email().optional(),
        bussinessPhone: Joi.string().optional()
    }),
    contactInfo: Joi.string().optional(),
    attachments: Joi.string().uri().required(),
    amountPaid: Joi.number().positive().optional(),
})

export { adSchema };