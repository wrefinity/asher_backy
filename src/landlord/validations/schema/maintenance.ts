import Joi from "joi";

export const maintenanceWhitelistSchema = Joi.object({
  categoryId: Joi.string().required(), 
  subcategoryId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
});

export const updateWhitelistSchema = Joi.object({
  categoryId: Joi.string().optional(),
  subcategoryId: Joi.string().optional(),
  propertyId: Joi.string(),
  apartmentId: Joi.string().optional(),
});
// cm255m7nu0005dr5sp7fgvf7p
// cm515lu0f0001rplbnslzsazs