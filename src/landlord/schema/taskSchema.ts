import Joi from "joi";

const TaskSchemaType = ['IN_PROGRESS', 'COMPLETED', 'PENDING']

const taskSchema = Joi.object({
    taskName: Joi.string().required(),
    description: Joi.string().required(),
    dueDate: Joi.date().iso().required(),
    status: Joi.string().valid(...TaskSchemaType).required(),
    propertyId: Joi.string().required()
})

export { taskSchema };