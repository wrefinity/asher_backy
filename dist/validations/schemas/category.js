"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subCategorySchema = exports.categorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const catType = Object.values(client_1.CategoryType);
exports.categorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    description: joi_1.default.string().optional(),
    categoryType: joi_1.default.string().valid(...catType).default(client_1.CategoryType.MAINTENANCE).required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    labels: joi_1.default.array().items(joi_1.default.string()).required()
});
exports.subCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    description: joi_1.default.string().optional(),
    type: joi_1.default.string().valid(...catType).default(client_1.CategoryType.MAINTENANCE).required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    // categoryId: Joi.string().required(),
    labels: joi_1.default.array().items(joi_1.default.string()).required()
});
