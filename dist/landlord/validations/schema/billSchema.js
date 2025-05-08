"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billUpdateSchema = exports.billSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const billFrequencyType = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const payableByValues = Object.values(client_1.PayableBy);
const billSchema = joi_1.default.object({
    billName: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    billCategory: joi_1.default.string().required(),
    amount: joi_1.default.number().required(),
    billFrequency: joi_1.default.string().valid(...billFrequencyType).required(),
    dueDate: joi_1.default.date().iso().required(),
    propertyId: joi_1.default.string().optional(),
    payableBy: joi_1.default.string().valid(...payableByValues).default(client_1.PayableBy.LANDLORD).required(),
    // tenants bills should be optional
    tenantId: joi_1.default.string().optional()
});
exports.billSchema = billSchema;
const billUpdateSchema = joi_1.default.object({
    billName: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    billCategory: joi_1.default.string().optional(),
    amount: joi_1.default.number().optional(),
    billFrequency: joi_1.default.string().valid(...billFrequencyType).optional(),
    dueDate: joi_1.default.date().iso().optional(),
    propertyId: joi_1.default.string().optional(),
    payableBy: joi_1.default.string().valid(...payableByValues).default(client_1.PayableBy.LANDLORD).optional(),
    // tenants bills should be optional
    tenantId: joi_1.default.string().optional()
});
exports.billUpdateSchema = billUpdateSchema;
