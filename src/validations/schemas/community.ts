import Joi from "joi";
import { uploadSchema } from "./upload.schema";

const communityInformationSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    visibility: Joi.string().valid('PUBLIC', 'PRIVATE').optional(),
}).concat(
    uploadSchema
)
const createCommentSchema = Joi.object({
  postId: Joi.string().required(),
  content: Joi.string().required(),
  parentCommentId: Joi.string().optional()
});
const toggleCommentLikeSchema = Joi.object({
  commentId: Joi.string().required(),
  isLike: Joi.boolean().required()
});
const forumInformationSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
}).concat(uploadSchema)


const communityPostSchema = Joi.object({
    name: Joi.string().required(),
    // category: Joi.string().required(),
    description: Joi.string().required(),
}).concat(uploadSchema)


const createCommunityPostSchema = Joi.object({
    title: Joi.string().required().max(200),
    content: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).default([]),
    categoryId: Joi.string().optional(),
    pinned: Joi.boolean().default(false),
    locked: Joi.boolean().default(false),
    poll: Joi.object({
        question: Joi.string().required().max(255),
        expiresAt: Joi.date().optional(),
        options: Joi.array().items(Joi.string().required()).min(2).required()
        // options: Joi.array()
        //     .items(
        //         Joi.object({
        //             option: Joi.string().required().max(100),
        //         })
        //     )
        //     .min(2)
        //     .required(),
    }).optional(),
}).concat(uploadSchema);

const updateCommunityPostSchema = Joi.object({
    title: Joi.string().optional().max(200),
    content: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()),
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
    pinned: Joi.boolean().optional(),
    locked: Joi.boolean().optional(),
    poll: Joi.object({
        question: Joi.string().required().max(255),
        expiresAt: Joi.date().optional(),
        options: Joi.array()
            .items(
                Joi.object({
                    option: Joi.string().required().max(100),
                })
            )
            .min(2)
            .required(),
    }).optional(),
});



export {
    createCommentSchema,
    toggleCommentLikeSchema,
    communityInformationSchema,
    forumInformationSchema,
    updateCommunityPostSchema,
    createCommunityPostSchema,
    communityPostSchema
};