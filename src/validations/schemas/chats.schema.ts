import Joi from 'joi';

export const chatSchema = Joi.object({
    content: Joi.string().required(),
    receiverId: Joi.string().required(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),        // Images
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),   // Videos
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),   // Audios
});
export const EmailSchema = Joi.object({
    senderEmail: Joi.string().required(),
    receiverEmail: Joi.string().required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
    isRead: Joi.boolean().optional(),
    isSent: Joi.boolean().optional(),
    isDraft: Joi.boolean().optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),        // Images
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),   // Videos
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),   // Audios
});


