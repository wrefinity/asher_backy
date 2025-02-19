"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSchema = exports.chatSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.chatSchema = joi_1.default.object({
    content: joi_1.default.string().required(),
    receiverId: joi_1.default.string().required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Images
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Videos
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Audios
});
exports.EmailSchema = joi_1.default.object({
    senderEmail: joi_1.default.string().required(),
    receiverEmail: joi_1.default.string().required(),
    subject: joi_1.default.string().required(),
    body: joi_1.default.string().required(),
    isRead: joi_1.default.boolean().optional(),
    isSent: joi_1.default.boolean().optional(),
    isDraft: joi_1.default.boolean().optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Images
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Videos
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(), // Audios
});
