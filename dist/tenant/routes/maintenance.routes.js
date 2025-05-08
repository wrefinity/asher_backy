"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
// import upload from "../../configs/multer";
// import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
const maintenance_controller_1 = __importDefault(require("../controllers/maintenance.controller"));
class MaintenanceRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        // this.router.post('/', upload.array('files'), uploadToCloudinary, adsController.createAd);
        this.router.get('/requests', maintenance_controller_1.default.getMaintenances);
    }
}
exports.default = new MaintenanceRouter().router;
