"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenance_controller_1 = __importDefault(require("../controllers/maintenance.controller"));
const authorize_1 = require("../middlewares/authorize");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const multer_1 = __importDefault(require("../configs/multer"));
class MaintenaceRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post('/accept/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.acceptMaintenanceOffer);
        this.router.post('/chats/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.createMaintenanceChat);
        this.router.get('/chats/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.getMaintenanceChat);
        this.router.get('/request-cancel/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.requestMaintenanceCancellation);
        this.router.get('/request-confirm/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.confirmCancellationByVendor);
        this.router.post('/completed/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.updateMaintenanceToCompleted);
        this.router.post('/reschedule/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.rescheduleMaintenanceController);
        this.router.post('/schedule/:maintenanceId', this.authenticateService.authorize, maintenance_controller_1.default.scheduleMaintenanceDate);
        this.router.post('/whitelisted', this.authenticateService.authorize, maintenance_controller_1.default.checkIfMaintenanceWhitelisted);
        this.router.get('/', maintenance_controller_1.default.getAllMaintenances);
        this.router.get('/:id', this.authenticateService.authorize, maintenance_controller_1.default.getMaintenanceById);
        this.router.post('/', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, maintenance_controller_1.default.createMaintenance);
        this.router.put('/:id', this.authenticateService.authorize, maintenance_controller_1.default.updateMaintenance);
        this.router.delete('/:id', this.authenticateService.authorize, maintenance_controller_1.default.deleteMaintenance);
    }
}
exports.default = new MaintenaceRoutes().router;
