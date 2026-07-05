import Joi from "joi";

const adSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  currency: Joi.string().valid("NGN", "GBP", "USD", "EUR").required(),
  startedDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref("startedDate")).required(),
  locations: Joi.array().items(Joi.string()).min(1).required(),
  bussinessDetails: Joi.object({
    bussinessName: Joi.string().required(),
    bussinessDescription: Joi.string().required(),
    bussinessWebsite: Joi.string().uri().optional(),
    bussinessEmail: Joi.string().email().optional(),
    bussinessPhone: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().optional(),
    socialLinks: Joi.object({
      twitter: Joi.string().optional(),
      instagram: Joi.string().optional(),
      facebook: Joi.string().optional(),
    }).optional(),
    isPremiumBanner: Joi.boolean().optional(),
    duration: Joi.number().integer().min(1).optional(),
    radius: Joi.number().optional(),
    locationMode: Joi.string().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    marketCountry: Joi.string().optional(),
  }).required(),
  contactInfo: Joi.string().allow("").optional(),
  amountPaid: Joi.number().positive().required(),
  isListed: Joi.boolean().optional().default(true),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
});

export { adSchema };
