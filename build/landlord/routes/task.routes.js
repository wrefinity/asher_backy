"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const task_controller_1 = __importDefault(require("../controllers/task.controller"));
class TaskRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', task_controller_1.default.createTask);
        this.router.get('/', task_controller_1.default.getAllTasks);
        this.router.get('/:taskId', task_controller_1.default.getTaskById);
        this.router.patch('/:taskId', task_controller_1.default.updateTask);
        this.router.delete('/:taskId', task_controller_1.default.deleteTask);
        this.router.get('/property/:propertyId', task_controller_1.default.getAllTasksByProperty);
    }
}
exports.default = new TaskRouter().router;
