"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const finance_controllers_1 = __importDefault(require("../controllers/finance.controllers"));
class FinanceRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.get('/', finance_controllers_1.default.getAllFinanceTransaction);
        this.router.get('/income', finance_controllers_1.default.getFInanceIncome);
        this.router.get('/expenses', finance_controllers_1.default.getFinancialExpenses);
        this.router.post('/generate-payment-link', finance_controllers_1.default.generatePaymentLink);
        this.router.get(':propertyId/monthly-analysis/:month/:year', finance_controllers_1.default.getMonthlyAnalysis);
        this.router.get('/:propertyId', finance_controllers_1.default.getIncomeStatistics);
        this.router.post('/budgets', finance_controllers_1.default.createBudget);
        this.router.put('/budgets/:id', finance_controllers_1.default.updateBudget);
    }
}
exports.default = new FinanceRouter().router;
