"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskUpdateSchema = exports.taskSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const PriorityType = ["LOW", "HIGH", "MEDIUM"];
const TaskSchemaType = ['IN_PROGRESS', 'COMPLETED', 'PENDING'];
const taskSchema = joi_1.default.object({
    taskName: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    dueDate: joi_1.default.date().iso().required(),
    status: joi_1.default.string().valid(...TaskSchemaType).required(),
    priority: joi_1.default.string().valid(...PriorityType).required(),
    propertyId: joi_1.default.string().required()
});
exports.taskSchema = taskSchema;
const taskUpdateSchema = joi_1.default.object({
    taskName: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    dueDate: joi_1.default.date().iso().optional(),
    status: joi_1.default.string().valid(...TaskSchemaType).optional(),
    priority: joi_1.default.string().valid(...PriorityType).optional(),
    propertyId: joi_1.default.string().optional()
});
exports.taskUpdateSchema = taskUpdateSchema;
