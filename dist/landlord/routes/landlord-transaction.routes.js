"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const landlord_transaction_controller_1 = __importDefault(require("../controllers/landlord-transaction.controller"));
const transactions_controllers_1 = __importDefault(require("../controllers/transactions.controllers"));
class LandlordTransactionRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        // Landlord Transactions Routes
        this.router.post('/:propertyId', landlord_transaction_controller_1.default.createTransaction);
        this.router.get('/:propertyId', transactions_controllers_1.default.getTransaction);
        this.router.get('/transact/:Id', landlord_transaction_controller_1.default.getTransactionById);
        this.router.get('/verify/:referenceId', landlord_transaction_controller_1.default.verifyPropertyPayment);
        this.router.get('/summary', landlord_transaction_controller_1.default.getTransactionSummary);
    }
}
exports.default = new LandlordTransactionRouter().router;
