"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInspectionSchema = exports.createInspectionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createInspectionSchema = joi_1.default.object({
    propertyId: joi_1.default.string().required(),
    tenantId: joi_1.default.string().required(),
    score: joi_1.default.number().integer().min(0).max(100).required(),
    notes: joi_1.default.string().allow('').optional(),
});
exports.updateInspectionSchema = joi_1.default.object({
    score: joi_1.default.number().integer().min(0).max(100).optional(),
    notes: joi_1.default.string().allow('').optional(),
});
