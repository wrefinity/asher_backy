"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const TicketStatus = ['open', 'in_progress', 'resolved', 'closed'];
const TicketAssignedTo = ['landlord', 'support'];
class SupportSchema {
    static create() {
        return joi_1.default.object({
            title: joi_1.default.string().required(),
            description: joi_1.default.string().required(),
            subject: joi_1.default.string().required(),
            status: joi_1.default.string().valid(...TicketStatus).default('open'),
            // attachment: Joi.array().items(Joi.string().uri().optional()).optional(),
            assignedTo: joi_1.default.string().valid(...TicketAssignedTo).required(),
            cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
        });
    }
    static update() {
        return joi_1.default.object({
            title: joi_1.default.string().optional(),
            description: joi_1.default.string(),
            subject: joi_1.default.string(),
            status: joi_1.default.string().valid(...TicketStatus),
            cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
            assignedTo: joi_1.default.string().valid(...TicketAssignedTo),
        });
    }
}
exports.default = SupportSchema;
