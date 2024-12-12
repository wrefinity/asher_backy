"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const billFrequencyType = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const payableByValues = Object.values(client_1.PayableBy);
const billSchema = joi_1.default.object({
    billName: joi_1.default.string().required(),
    billCategory: joi_1.default.string().required(),
    amount: joi_1.default.number().required(),
    billFrequency: joi_1.default.string().valid(...billFrequencyType).required(),
    dueDate: joi_1.default.date().iso().required(),
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
    payableBy: joi_1.default.string().valid(...payableByValues).default(client_1.PayableBy.LANDLORD).required(),
    // tenants bills should be optional
    tenantId: joi_1.default.string().optional()
});
exports.billSchema = billSchema;
