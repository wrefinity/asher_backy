import Joi from "joi";

const communityInformationSchema = Joi.object({
    communityName: Joi.string().required(),
    description: Joi.string().required(),
    visibility: Joi.string().valid('PUBLIC', 'PRIVATE').optional(),
    // communityProfileImage: Joi.string().uri().optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri().optional()).optional(),
})

const communityPostSchema = Joi.object({
    title: Joi.string().required(),
    category: Joi.string().required(),
    tags: Joi.array().items(Joi.string().optional()).optional(),
    content: Joi.string().required(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri().optional()).optional(),
})

export { communityInformationSchema, communityPostSchema };