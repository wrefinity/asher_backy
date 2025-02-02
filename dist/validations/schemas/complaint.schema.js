"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComplaintSchema = exports.createComplaintSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const catType = Object.values(client_1.ComplaintCategory);
const statusType = Object.values(client_1.ComplaintStatus);
const priorType = Object.values(client_1.ComplaintPriority);
exports.createComplaintSchema = joi_1.default.object({
    category: joi_1.default.string().valid(...catType).default(client_1.ComplaintCategory.MAINTENANCE).required(),
    subject: joi_1.default.string().required(),
    propertyId: joi_1.default.string().optional(),
    priority: joi_1.default.string().valid(...priorType).default(client_1.ComplaintPriority.LOW).required(),
    status: joi_1.default.string().valid(...statusType).default(client_1.ComplaintStatus.IN_PROGRESS).optional(),
});
exports.updateComplaintSchema = joi_1.default.object({
    category: joi_1.default.string().valid(...catType).default(client_1.ComplaintCategory.MAINTENANCE).optional(),
    subject: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    priority: joi_1.default.string().valid(...priorType).default(client_1.ComplaintPriority.LOW).optional(),
    status: joi_1.default.string().valid(...statusType).default(client_1.ComplaintStatus.IN_PROGRESS).optional(),
});
