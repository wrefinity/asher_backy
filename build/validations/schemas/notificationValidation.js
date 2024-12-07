"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createNotificationSchema = joi_1.default.object({
    sourceId: joi_1.default.string().required(),
    destId: joi_1.default.string().required(),
    title: joi_1.default.string().required(),
    message: joi_1.default.string().required(),
    isRead: joi_1.default.boolean().default(false),
});
