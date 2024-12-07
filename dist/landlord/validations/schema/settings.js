"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propAvailabiltySchema = exports.propApartmentSettingsUpdateSchema = exports.GlobalSettingsSchema = exports.propApartmentSettingsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.propApartmentSettingsSchema = joi_1.default.object({
    propertyId: joi_1.default.string().required(),
    apartmentId: joi_1.default.string().optional(),
    lateFee: joi_1.default.number().min(0).precision(2).optional(),
    lateFeeFrequency: joi_1.default.string().valid('ONE_TIME', 'DAILY', 'WEEKLY').optional(),
    lateFeePercentage: joi_1.default.number().optional(),
    gracePeriodDays: joi_1.default.string().optional(),
    // security deposit
    depositPercentage: joi_1.default.number().optional(),
    refundTimeframe: joi_1.default.string().optional(),
    // application section
    applicationFee: joi_1.default.number().optional(),
    refundPolicy: joi_1.default.string().valid('YES', 'NO').optional()
});
exports.GlobalSettingsSchema = joi_1.default.object({
    percentageOrAmount: joi_1.default.number().required(),
    type: joi_1.default.string().valid('SECURITY_DEPOSIT', 'RECURRING').required(),
});
exports.propApartmentSettingsUpdateSchema = joi_1.default.object({
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
    lateFee: joi_1.default.number().min(0).precision(2).optional(),
    latePaymentFeeType: joi_1.default.string().valid('ONE_TIME', 'RECURRING').optional(),
});
exports.propAvailabiltySchema = joi_1.default.object({
    availability: joi_1.default.string().valid('OCCUPIED', 'VACANT').required(),
});
