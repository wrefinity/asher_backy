"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaDocumentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
exports.MediaDocumentSchema = joi_1.default.object({
    documentName: joi_1.default.string().required(),
    docType: joi_1.default.string()
        .valid(...Object.values(client_1.DocumentType))
        .optional(),
    idType: joi_1.default.string()
        .valid(...Object.values(client_1.IdType))
        .optional(),
    type: joi_1.default.string().required(),
    size: joi_1.default.string().required(),
});
