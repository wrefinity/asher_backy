"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const logsType = Object.values(client_1.LogType);
exports.LogsSchema = joi_1.default.object({
    events: joi_1.default.string().required(),
    type: joi_1.default.string().valid(...logsType).optional(),
    propertyId: joi_1.default.string().optional(),
    transactionId: joi_1.default.string().optional(),
    userId: joi_1.default.string().optional()
});
