import Joi from "joi";
const  PriorityType = ["LOW", "HIGH", "MEDIUM"]
const TaskSchemaType = ['IN_PROGRESS', 'COMPLETED', 'PENDING']

const taskSchema = Joi.object({
    taskName: Joi.string().required(),
    description: Joi.string().required(),
    dueDate: Joi.date().iso().required(),
    status: Joi.string().valid(...TaskSchemaType).required(),
    priority: Joi.string().valid(...PriorityType).required(),
    propertyId: Joi.string().required()
})
const taskUpdateSchema = Joi.object({
    taskName: Joi.string().optional(),
    description: Joi.string().optional(),
    dueDate: Joi.date().iso().optional(),
    status: Joi.string().valid(...TaskSchemaType).optional(),
    priority: Joi.string().valid(...PriorityType).optional(),
    propertyId: Joi.string().optional()
})

export { taskSchema, taskUpdateSchema};