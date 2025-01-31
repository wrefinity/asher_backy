"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const PaymentType = ["rent_due", "rent_payment", "maintainace_fee", "landlord_payout"];
class TransactionSchema {
    static create() {
        return joi_1.default.object({
            amount: joi_1.default.number().required(),
            gateWayType: joi_1.default.string().valid(...Object.values(client_1.PaymentGateway)).required(),
        });
    }
    static transactSchema() {
        return joi_1.default.object({
            paymentGateway: joi_1.default.string().valid(...Object.values(client_1.PaymentGateway)).optional(),
            reference: joi_1.default.string().valid(...Object.values(client_1.TransactionReference)).optional(),
            propertyId: joi_1.default.string().optional(),
            billId: joi_1.default.string().optional(),
            apartmentId: joi_1.default.string().optional(),
            walletId: joi_1.default.string().optional(),
            amount: joi_1.default.number().required(),
            currency: joi_1.default.string().optional(),
            description: joi_1.default.string().optional(),
        });
    }
    static makePayment() {
        return joi_1.default.object({
            billType: joi_1.default.string().valid(...PaymentType).required(),
            amount: joi_1.default.number().required(),
            currency: joi_1.default.number().required(),
            set_auto: joi_1.default.boolean().optional
        });
    }
    static withdraw() {
        return joi_1.default.object({
            amount: joi_1.default.number().required(),
        });
    }
    static trasferFunds() {
        return joi_1.default.object({
            amount: joi_1.default.number().required(),
            recieiverId: joi_1.default.string().required(),
            description: joi_1.default.string().optional(),
        });
    }
}
exports.default = TransactionSchema;
