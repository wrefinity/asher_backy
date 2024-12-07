"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const bank_controller_1 = __importDefault(require("../controllers/bank.controller"));
class BankRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // Create a new bank info
        this.router.post('/bank-info', this.authenticateService.authorize, bank_controller_1.default.createBankInfo);
        // Get a bank info by ID
        this.router.get('/bank-info/:id', this.authenticateService.authorize, bank_controller_1.default.getBankInfo);
        // Update a bank info by ID
        this.router.put('/bank-info/:id', this.authenticateService.authorize, bank_controller_1.default.updateBankInfo);
        // Delete a bank info by ID
        this.router.delete('/bank-info/:id', this.authenticateService.authorize, bank_controller_1.default.deleteBankInfo);
        // Get all bank info records
        this.router.get('/bank-info', this.authenticateService.authorize, bank_controller_1.default.getAllBankInfo);
    }
}
exports.default = new BankRouter().router;
