"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const tenant_bills_controllers_1 = __importDefault(require("../controllers/tenant-bills.controllers"));
class TenantBillRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.get('/bills', tenant_bills_controllers_1.default.getTenantBill);
        this.router.get('/overdue-bills', tenant_bills_controllers_1.default.getOverdueBills);
        this.router.get('/upcoming-bills', tenant_bills_controllers_1.default.getUpcomingBills);
    }
}
exports.default = new TenantBillRouter().router;
