"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subCategorySchema = exports.categorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.categorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    labels: joi_1.default.array().items(joi_1.default.string()).required()
});
exports.subCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    // categoryId: Joi.string().required(),
    labels: joi_1.default.array().items(joi_1.default.string()).required()
});
