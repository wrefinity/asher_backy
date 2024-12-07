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
const notification_service_1 = __importDefault(require("../services/notification.service"));
const notificationValidation_1 = require("../validations/schemas/notificationValidation");
class NotificationController {
    constructor() {
        this.createNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = notificationValidation_1.createNotificationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const sourceId = req.user.id;
                const notification = yield notification_service_1.default.createNotification(Object.assign(Object.assign({}, req.body), { sourceId }));
                res.status(201).json(notification);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        this.getAllNotifications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const notifications = yield notification_service_1.default.getAllNotifications(userId);
                res.status(200).json(notifications);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        this.getNotificationById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const notification = yield notification_service_1.default.getNotificationById(id);
                if (!notification) {
                    return res.status(404).json({ error: 'Notification not found' });
                }
                res.status(200).json(notification);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        this.updateNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const notification = yield notification_service_1.default.updateNotification(id, req.body);
                if (!notification) {
                    return res.status(404).json({ error: 'Notification not found' });
                }
                res.status(200).json(notification);
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
        this.deleteNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const notification = yield notification_service_1.default.deleteNotification(id);
                if (!notification) {
                    return res.status(404).json({ error: 'Notification not found' });
                }
                res.status(200).json({ message: 'Notification deleted successfully' });
            }
            catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
}
exports.default = new NotificationController();
