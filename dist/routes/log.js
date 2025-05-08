"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logs_controller_1 = __importDefault(require("../controllers/logs.controller"));
const authorize_1 = require("../middlewares/authorize");
class LogRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', this.authenticateService.authorize, logs_controller_1.default.createLog);
        this.router.get('/property/:propertyId', logs_controller_1.default.getProperyLog);
    }
}
exports.default = new LogRoutes().router;
