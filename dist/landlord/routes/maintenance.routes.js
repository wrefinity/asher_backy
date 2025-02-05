"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenance_controller_1 = __importDefault(require("../controllers/maintenance.controller"));
const authorize_1 = require("../../middlewares/authorize");
class LandlordMaintenanceRoute {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/statistics', maintenance_controller_1.default.getMaintenancesCounts);
        // this.router.get('/statistics', LandlordMaintenanceControls.getCurrentLandlordMaintenances);
        this.router.get('/requests', maintenance_controller_1.default.getMaintenances);
        this.router.get('/property/:propertyId', maintenance_controller_1.default.getPropertyMaintenance);
        this.router.post('/accept/:maintenanceId', maintenance_controller_1.default.acceptMaintenaceRequest);
        this.router.post('/decline/:maintenanceId', maintenance_controller_1.default.declineMaintenaceRequest);
        this.router.get('/tenants/tenantId', maintenance_controller_1.default.getTenantsMaintenances);
        this.router.delete('/:maintenanceId', maintenance_controller_1.default.deleteMaintenance);
        // whitelisting maintenances
        this.router.post('/whitelist', maintenance_controller_1.default.createWhitelist);
        this.router.patch('/whitelist/toggle/:subCategoryId', maintenance_controller_1.default.toggleMaintenanceWhiteList);
        this.router.get('/whitelist', maintenance_controller_1.default.getWhitelistByLandlord);
        this.router.get('/whitelist/all', maintenance_controller_1.default.getMaintenanceWithWhiteListed);
        this.router.patch('/whitelist/:whitelistId', maintenance_controller_1.default.updateWhitelist);
    }
}
// cm57schfs0000refzg0j13jpx - categpory
// cm57swrez0002refzkdqv44x6 - subcategory
exports.default = new LandlordMaintenanceRoute().router;
// {
//     "offer":["100"],
//     "propertyId": "cm1worljs0003uob6eysm7d3y",
//     "description":"pipe breaks",
//     "apartmentId":"clyxgodw70003nuzgt3pkeojg",
//     "categoryId":"cm1l43ogj000013h90b6uy9st",
//     "subcategoryIds":["cm1jpxvzx0001zmipgdyhykza"],
//     "serviceId":"cm1jq290m0001urs2zqm95735",
//     "scheduleDate": "2024-11-15T00:00:00Z"
//   }
