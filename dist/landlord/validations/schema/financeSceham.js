"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBudgetSchema = exports.budgetSchema = void 0;
const client_1 = require("@prisma/client");
const joi_1 = __importDefault(require("joi"));
const budgetSchema = joi_1.default.object({
    propertyId: joi_1.default.string().required(),
    transactionType: joi_1.default.string()
        .valid(...[client_1.TransactionReference])
        .required(),
    budgetAmount: joi_1.default.number().positive().required(),
    frequency: joi_1.default.string()
        .valid(...[client_1.BudgetFrequency])
        .required(),
});
exports.budgetSchema = budgetSchema;
const updateBudgetSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    amount: joi_1.default.number().required(),
});
exports.updateBudgetSchema = updateBudgetSchema;
