"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankInfoSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.bankInfoSchema = joi_1.default.object({
    //   landlordId: Joi.string().optional().allow(null),
    //   vendorId: Joi.string().optional().allow(null),
    bankName: joi_1.default.string().min(2).max(100).required(),
    accountNumber: joi_1.default.string().min(10).max(20).required(),
    accountName: joi_1.default.string().min(2).max(100).required(),
});
