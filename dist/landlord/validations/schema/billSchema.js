"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantBillSchema = exports.billSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const billFrequencyType = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const billSchema = joi_1.default.object({
    billName: joi_1.default.string().required(),
    billCategory: joi_1.default.string().required(),
    amount: joi_1.default.number().required(),
    billFrequency: joi_1.default.string().valid(...billFrequencyType).required(),
    dueDate: joi_1.default.date().iso().required(),
    propertyId: joi_1.default.string().required()
});
exports.billSchema = billSchema;
const tenantBillSchema = joi_1.default.object({
    billName: joi_1.default.string().required(),
    billCategory: joi_1.default.string().required(),
    amount: joi_1.default.number().required(),
    billFrequency: joi_1.default.string().valid(...billFrequencyType).required(),
    dueDate: joi_1.default.date().iso().required(),
    propertyId: joi_1.default.string().required(),
    tenantId: joi_1.default.string().required()
});
exports.tenantBillSchema = tenantBillSchema;
