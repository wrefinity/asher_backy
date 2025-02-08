"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const authorize_1 = require("../../middlewares/authorize");
const tenant_controller_1 = __importDefault(require("../controllers/tenant.controller"));
const tenant_bills_routes_1 = __importDefault(require("./tenant-bills.routes"));
const maintenance_routes_1 = __importDefault(require("./maintenance.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
class TenantRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize, this.authenticateService.authorizeRole(client_1.userRoles.TENANT));
        this.router.get('/:tenantId', tenant_controller_1.default.getTenantById);
        this.router.use('/dashboard', dashboard_routes_1.default);
        this.router.use('/bills', tenant_bills_routes_1.default);
        this.router.use('/maintenances', maintenance_routes_1.default);
    }
}
exports.default = new TenantRouter().router;
