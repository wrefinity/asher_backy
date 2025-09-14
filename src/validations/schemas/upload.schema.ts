import Joi from 'joi';

// Uploaded documents schema
export const uploadedDocumentSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Each document must have a valid URL',
    'any.required': 'Document URL is required',
  }),
  type: Joi.string().max(50).required().messages({
    'string.empty': 'Document type is required',
    'any.required': 'Document type is required',
  }),
});

// Upload schema for Cloudinary fields + uploaded documents
export const uploadSchema = Joi.object({
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  uploadedDocuments: Joi.array().items(uploadedDocumentSchema).optional(),
});

