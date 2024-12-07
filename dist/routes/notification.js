"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = __importDefault(require("../controllers/notification.controller"));
const authorize_1 = require("../middlewares/authorize");
class NotificationRoutes {
    constructor() {
        this.router = express_1.default.Router();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/', this.authenticateService.authorize, notification_controller_1.default.createNotification);
        this.router.get('/me', this.authenticateService.authorize, notification_controller_1.default.getAllNotifications);
        this.router.get('/:id', this.authenticateService.authorize, notification_controller_1.default.getNotificationById);
        this.router.patch('/:id', this.authenticateService.authorize, notification_controller_1.default.updateNotification);
        this.router.delete('/:id', this.authenticateService.authorize, notification_controller_1.default.deleteNotification);
    }
}
exports.default = new NotificationRoutes().router;
