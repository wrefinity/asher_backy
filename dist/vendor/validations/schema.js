"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyOfferSchema = exports.serviceSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Joi validation schema
exports.serviceSchema = joi_1.default.object({
    currentJobs: joi_1.default.number().optional(),
    availability: joi_1.default.string().valid('YES', 'NO').required(),
    standardPriceRange: joi_1.default.string().required(),
    mediumPriceRange: joi_1.default.string().required(),
    premiumPriceRange: joi_1.default.string().required(),
    categoryId: joi_1.default.string().required(),
    subcategoryId: joi_1.default.string().required(),
});
// {
//   "plan":"standard",
//   "subcategoryIds":["clysffhoy0001w3190ywm99lh"]
// } 
exports.applyOfferSchema = joi_1.default.object({
    params: joi_1.default.object({
        categoryId: joi_1.default.string().required()
    }),
    body: joi_1.default.object({
        subcategoryIds: joi_1.default.array().items(joi_1.default.string().required()).required(),
        plan: joi_1.default.string().valid('standard', 'medium', 'premium').optional(),
        offer: joi_1.default.number().optional(),
    })
});
