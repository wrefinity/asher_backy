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

export { inventorySchema };