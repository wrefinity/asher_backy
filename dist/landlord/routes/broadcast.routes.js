"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const broadcast_controller_1 = __importDefault(require("../controllers/broadcast.controller"));
class BroadcastRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.get('/:category', broadcast_controller_1.default.getBroadcastByCategory);
        this.router.get('/', broadcast_controller_1.default.getBroadcastsByLandlord);
        this.router.get('/:broadcastId', broadcast_controller_1.default.getBroadcastById);
    }
}
exports.default = new BroadcastRouter().router;
