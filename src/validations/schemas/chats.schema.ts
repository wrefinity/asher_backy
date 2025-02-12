import Joi from 'joi';

export const chatSchema = Joi.object({
    content: Joi.string().required(),
    receiverId: Joi.string().required(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),        // Images
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),   // Videos
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),   // Audios
});
