"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactions_controllers_1 = __importDefault(require("../controllers/transactions.controllers"));
const transfer_controllers_1 = __importDefault(require("../controllers/transfer.controllers"));
const authorize_1 = require("../middlewares/authorize");
class TransactionRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/fund-wallet', transactions_controllers_1.default.fundWallet);
        // this.router.patch('/verify/:referenceId', transactionsControllers.verifyPayment)
        // this.router.patch('/verify-flutter/:referenceId', transactionsControllers.verifyFlutterWave)
        // this.router.patch('/verify-stripe/:referenceId', transactionsControllers.verifyStripe)
        // this.router.post('/pay-bill', transferControllers.makePayment)
        this.router.post('/pay-bill', transactions_controllers_1.default.makeTransaction);
        this.router.post('/transfer', transfer_controllers_1.default.transferFunds);
    }
}
exports.default = new TransactionRouter().router;
