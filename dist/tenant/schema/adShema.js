"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const adSchema = joi_1.default.object({
    title: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    currency: joi_1.default.string().required(),
    startedDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().greater(joi_1.default.ref('startedDate')).required(),
    locations: joi_1.default.array().items(joi_1.default.string()).optional(),
    bussinessDetails: joi_1.default.object({
        bussinessName: joi_1.default.string().required(),
        bussinessDescription: joi_1.default.string().required(),
        bussinessWebsite: joi_1.default.string().uri().optional(),
        bussinessEmail: joi_1.default.string().email().optional(),
        bussinessPhone: joi_1.default.string().optional()
    }),
    contactInfo: joi_1.default.string().optional(),
    amountPaid: joi_1.default.number().positive().optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
exports.adSchema = adSchema;
