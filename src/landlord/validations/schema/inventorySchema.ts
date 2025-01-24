import Joi from "joi";

const InventorySchemaType = ['UNAVIALABLE', 'AVAILABLE', 'UNDER_MAINTANACE']

const inventorySchema = Joi.object({
    itemName: Joi.string().required(),
    description: Joi.string().required(),
    quantity: Joi.number().required(),
    itemLocation: Joi.string().required(),
    status: Joi.string().valid(...InventorySchemaType).required(),
    propertyId: Joi.string().required()
})
const inventoryUpdateSchema = Joi.object({
    itemName: Joi.string().optional(),
    description: Joi.string().optional(),
    quantity: Joi.number().optional(),
    itemLocation: Joi.string().optional(),
    status: Joi.string().valid(...InventorySchemaType).optional(),
    propertyId: Joi.string().optional()
})

export { inventorySchema, inventoryUpdateSchema};