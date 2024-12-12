"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const bill_controller_1 = __importDefault(require("../controllers/bill.controller"));
class BillRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', bill_controller_1.default.createBill);
        this.router.get('/', bill_controller_1.default.getAllBills);
        this.router.get('/:billId', bill_controller_1.default.getSingleBill);
        this.router.get('/:propertyId', bill_controller_1.default.getBillByPropertyId);
        this.router.patch('/:billId', bill_controller_1.default.updateBill);
        this.router.delete('/:billId', bill_controller_1.default.deleteBill);
    }
}
exports.default = new BillRouter().router;
