"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityPostSchema = exports.communityInformationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const communityInformationSchema = joi_1.default.object({
    communityName: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    visibility: joi_1.default.string().valid('PUBLIC', 'PRIVATE').optional(),
    // communityProfileImage: Joi.string().uri().optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri().optional()).optional(),
});
exports.communityInformationSchema = communityInformationSchema;
const communityPostSchema = joi_1.default.object({
    title: joi_1.default.string().required(),
    category: joi_1.default.string().required(),
    tags: joi_1.default.array().items(joi_1.default.string().optional()).optional(),
    content: joi_1.default.string().required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri().optional()).optional(),
});
exports.communityPostSchema = communityPostSchema;
