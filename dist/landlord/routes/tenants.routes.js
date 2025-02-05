"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const tenant_controller_1 = __importDefault(require("../controllers/tenant.controller"));
const multer_1 = require("../../configs/multer");
class TenantsLandlordRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // tenants modules under landlord
        this.router.get('/get', tenant_controller_1.default.getTenancies);
        this.router.get('/currents', tenant_controller_1.default.getCurrentTenant);
        this.router.get('/previous', tenant_controller_1.default.getPreviousTenant);
        this.router.post('/upload', multer_1.uploadcsv.single("files"), tenant_controller_1.default.bulkTenantUpload);
        this.router.post('/milestones/', tenant_controller_1.default.createTenantMileStones);
        this.router.get('/milestones/:tenantUserId', tenant_controller_1.default.getTenantMileStones);
    }
}
exports.default = new TenantsLandlordRouter().router;
