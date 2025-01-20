"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rescheduleMaintenanceSchema = exports.maintenanceChatSchema = exports.checkWhitelistedSchema = exports.maintenanceCancelSchema = exports.maintenanceSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.maintenanceSchema = joi_1.default.object({
    description: joi_1.default.string().optional(),
    scheduleDate: joi_1.default.date().required(),
    offer: joi_1.default.array().items(joi_1.default.string()).optional(),
    amount: joi_1.default.number(),
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
    categoryId: joi_1.default.string().required(),
    vendorId: joi_1.default.string().optional(),
    subcategoryIds: joi_1.default.array().items(joi_1.default.string()).required(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    serviceId: joi_1.default.string().required(),
});
exports.maintenanceCancelSchema = joi_1.default.object({
    reason: joi_1.default.string().optional(),
});
exports.checkWhitelistedSchema = joi_1.default.object({
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
    categoryId: joi_1.default.string().required(),
    // subcategoryIds: Joi.array().items(Joi.string()).optional(),
    subcategoryId: joi_1.default.string().optional(),
});
exports.maintenanceChatSchema = joi_1.default.object({
    receiverId: joi_1.default.string().required(),
    message: joi_1.default.string().required(),
});
exports.rescheduleMaintenanceSchema = joi_1.default.object({
    // maintenanceId: Joi.string().required(),
    newScheduleDate: joi_1.default.date().greater('now').required(),
});
