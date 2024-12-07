"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// validations/schemas/landlordTransaction.schema.ts
const client_1 = require("@prisma/client");
const joi_1 = __importDefault(require("joi"));
const landlordTransactionSchema = {
    create: () => joi_1.default.object({
        description: joi_1.default.string().optional(),
        amount: joi_1.default.number().precision(2).required(),
        tenantId: joi_1.default.string().required(),
        type: joi_1.default.string().valid(...Object.values(client_1.TransactionReference)).required(),
        transactionStatus: joi_1.default.string().valid(...Object.values(client_1.TransactionStatus)).required(),
        paidDate: joi_1.default.date().required(),
    })
};
exports.default = landlordTransactionSchema;
