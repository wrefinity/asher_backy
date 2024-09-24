import Joi from "joi";

export const maintenanceWhitelistSchema = Joi.object({
  categoryId: Joi.string().required(), 
  subcategoryId: Joi.string().optional(),
  propertyId: Joi.string(),
  apartmentId: Joi.string().optional(),
});

export const updateWhitelistSchema = Joi.object({
  categoryId: Joi.string().optional(),
  subcategoryId: Joi.string().optional(),
  propertyId: Joi.string(),
  apartmentId: Joi.string().optional(),
});
