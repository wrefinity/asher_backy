"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../../services/error.service"));
const taskSchema_1 = require("../validations/schema/taskSchema");
const task_services_1 = __importDefault(require("../services/task.services"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
class TaskController {
    constructor() {
        this.createTask = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { error, value } = taskSchema_1.taskSchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            // check for property existance
            const propertyId = value === null || value === void 0 ? void 0 : value.propertyId;
            const checkPropsExits = yield propertyServices_1.default.getPropertyById(propertyId);
            if (!checkPropsExits)
                return res.status(404).json({ message: "Property not found" });
            // create task base on props
            try {
                const task = yield task_services_1.default.createTask(value);
                return res.status(201).json(task);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllTasks = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const checkPropsExits = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!checkPropsExits)
                    return res.status(404).json({ message: "Property not found" });
                const tasks = yield task_services_1.default.getAllTask(propertyId);
                return res.status(200).json(tasks);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTaskById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { taskId } = req.params;
                const task = yield task_services_1.default.getTaskById(taskId);
                if (!task)
                    return res.status(404).json({ message: "Task not found" });
                return res.status(200).json(task);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateTask = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { taskId } = req.params;
            const { error, value } = yield taskSchema_1.taskUpdateSchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            try {
                const task = yield task_services_1.default.getTaskById(taskId);
                if (!task)
                    return res.status(404).json({ message: "Task not found" });
                const updatedTask = yield task_services_1.default.updateTask(taskId, value);
                if (!updatedTask)
                    return res.status(404).json({ message: "Task not found" });
                return res.status(200).json({ updatedTask });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteTask = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedTask = yield task_services_1.default.deleteTask(req.params.taskId);
                if (!deletedTask)
                    return res.status(404).json({ message: "Task not found" });
                return res.status(200).json(deletedTask);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getAllTasksByProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { propertyId } = req.params;
                const checkPropsExits = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!checkPropsExits)
                    return res.status(404).json({ message: "Property not found" });
                const tasks = yield task_services_1.default.getAllTasksByProperty(propertyId);
                // if (tasks.length === 0) return res.status(404).json({ message: "No tasks found" });
                return res.status(200).json(tasks);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new TaskController();
