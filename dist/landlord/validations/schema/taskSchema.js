"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const TaskSchemaType = ['IN_PROGRESS', 'COMPLETED', 'PENDING'];
const taskSchema = joi_1.default.object({
    taskName: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    dueDate: joi_1.default.date().iso().required(),
    status: joi_1.default.string().valid(...TaskSchemaType).required(),
    propertyId: joi_1.default.string().required()
});
exports.taskSchema = taskSchema;
