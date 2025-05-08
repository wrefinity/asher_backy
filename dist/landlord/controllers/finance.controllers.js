"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../../services/error.service"));
const finance_service_1 = __importDefault(require("../services/finance.service"));
const helpers_1 = require("../../utils/helpers");
const financeSceham_1 = require("../validations/schema/financeSceham");
class FinanceController {
    getAllFinanceTransaction(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            try {
                const transactions = yield finance_service_1.default.getAllFinanceTransaction(landlordId);
                if (transactions.length < 1) {
                    return res.status(200).json({ message: "No transactions found" });
                }
                return res.status(200).json(transactions);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getFInanceIncome(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            const { propertyId } = req.params;
            try {
                const income = yield finance_service_1.default.getFinanceIncome(landlordId);
                if (income.length < 1) {
                    return res.status(200).json({ message: "No income found" });
                }
                return res.status(200).json(income);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getFinancialExpenses(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            const { propertyId } = req.params;
            try {
                const expenses = yield finance_service_1.default.getFInanceExpense(landlordId);
                if (expenses.length < 1) {
                    return res.status(200).json({ message: "No expenses found" });
                }
                return res.status(200).json(expenses);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    generatePaymentLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = req.user.id;
            const { amount, expirationDate, email, description, payeeId } = req.body;
            if (!payeeId || !amount) {
                return res.status(400).json({ message: "Please provide payeeId and amount" });
            }
            //NOTE: Get the userId from user table using the email
            const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            // Get country code from IP address
            const countryCode = yield (0, helpers_1.getCountryCodeFromIp)(userIpAddress);
            try {
                const validAmount = Number(amount);
                // Generate payment link
                const fundWallet = yield finance_service_1.default.generatePaymentLink(payeeId, userId, validAmount, 'usd', countryCode, expirationDate, description, email);
                res.status(200).json(fundWallet);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getMonthlyAnalysis(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            const { propertyId, month, year } = req.params;
            if (!month || !propertyId || !year) {
                return res.status(400).json({ message: "Please provide month, propertyId and year" });
            }
            try {
                const monthlyAnalysis = yield finance_service_1.default.getMonthlyAnalysis(parseFloat(month), parseFloat(year), propertyId, landlordId);
                return res.status(200).json(monthlyAnalysis);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getIncomeStatistics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = landlords.id;
            const { propertyId } = req.params;
            if (!propertyId) {
                return res.status(400).json({ message: "Please provide propertyId" });
            }
            try {
                const annualPayments = yield finance_service_1.default.getIncomeStatistics(propertyId, landlordId);
                return res.status(200).json(annualPayments);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    createBudget(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, value } = financeSceham_1.budgetSchema.validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            const { propertyId, transactionType, budgetAmount, frequency } = value;
            try {
                const budget = yield finance_service_1.default.createBudget(propertyId, transactionType, budgetAmount, frequency);
                res.status(201).json(budget);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    updateBudget(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { amount } = req.body;
            const { id } = req.params;
            try {
                yield finance_service_1.default.updateBudget(id, amount);
                res.status(200).json({ message: 'Budget updated successfully' });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new FinanceController();
