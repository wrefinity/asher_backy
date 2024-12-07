"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const status_controller_1 = __importDefault(require("../controllers/status.controller"));
const authorize_1 = require("../middlewares/authorize");
class ChatRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/', status_controller_1.default.getAllStatuses);
        this.router.get('/:id', status_controller_1.default.getStatusById);
        this.router.post('/', this.authenticateService.authorize, status_controller_1.default.createStatus);
        this.router.patch('/:id', status_controller_1.default.updateStatus);
        this.router.delete('/:id', status_controller_1.default.deleteStatus);
    }
}
exports.default = new ChatRoutes().router;
