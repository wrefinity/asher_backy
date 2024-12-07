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
const client_1 = require("@prisma/client");
const __1 = require("../..");
const transaction_services_1 = __importDefault(require("../../services/transaction.services"));
const stripe_service_1 = __importDefault(require("../../services/stripe.service"));
const wallet_service_1 = __importDefault(require("../../services/wallet.service"));
class FinanceService {
    getFinanceIncome(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.transaction.findMany({
                where: {
                    userId,
                    reference: { in: [client_1.TransactionReference.RENT_PAYMENT, client_1.TransactionReference.LATE_FEE, client_1.TransactionReference.CHARGES, client_1.TransactionReference.MAINTENANCE_FEE] },
                },
                include: {
                    property: true
                }
            });
        });
    }
    getFInanceExpense(landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findMany({
                where: {
                    landlordId,
                },
                include: {
                    property: true
                }
            });
        });
    }
    getAllFinanceTransaction(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.transaction.findMany({
                where: {
                    userId,
                },
                include: {
                    property: true
                }
            });
        });
    }
    generatePaymentLink(payeeId_1, creatorId_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (payeeId, creatorId, amount, currency = 'usd', countryCode, expirationDate, description, email) {
            const creator = yield __1.prismaClient.users.findUnique({ where: { id: creatorId } });
            const payee = yield __1.prismaClient.users.findUnique({ where: { id: payeeId } });
            if (!creator || !payee) {
                throw new Error('Creator or payee not found');
            }
            const creatorWallet = yield wallet_service_1.default.getOrCreateWallet(creatorId, currency);
            const payeeWallet = yield wallet_service_1.default.getOrCreateWallet(payeeId, currency);
            // const gateway = paymentGatewayService.selectGateway(countryCode);
            let paymentResponse;
            let referenceId;
            let paymentUrl;
            // NOTE: it should be the payeeId that's the stripeCustomer
            // switch (gateway) {
            //     case PaymentGateway.STRIPE:
            //         const stripeCustomer = await stripeService.createOrGetStripeCustomer(landlordId);
            //         //TODO: Check minutes here
            //         const payment = await stripeService.createPaymentLink(amount * 100, currency, stripeCustomer.id, 160);
            //         paymentUrl = payment.url;
            //         referenceId = payment.id;
            //         break;
            //     case PaymentGateway.FLUTTERWAVE:
            //         referenceId = generateIDs('FTWREF');
            //         const flutterwavePayment = await flutterWaveService.initializePayment(
            //             amount,
            //             currency,
            //             email,
            //             referenceId,
            //             description,
            //             expirationDate
            //         );
            //         paymentResponse = flutterwavePayment;
            //         paymentUrl = flutterwavePayment.data.link;
            //         break;
            //     case PaymentGateway.PAYSTACK:
            //         const transactionDetails = {
            //             amount: amount,
            //             email: email,
            //             description,
            //             expires_at: expirationDate,
            //         };
            //         const paystackPayment = await paystackServices.initializePayment({ ...transactionDetails });
            //         paymentResponse = paystackPayment;
            //         referenceId = paystackPayment.data.reference;
            //         paymentUrl = paystackPayment.data.authorization_url;
            //         break;
            //     default:
            //         throw new Error("Unsupported payment gateway");
            // }
            // Create a transaction record
            const stripeCustomer = yield stripe_service_1.default.createOrGetStripeCustomer(payeeId);
            //TODO: Check minutes here
            const payment = yield stripe_service_1.default.createPaymentLink(amount * 100, currency, stripeCustomer.id, 160);
            paymentUrl = payment.url;
            referenceId = payment.id;
            // Create a transaction for the payee (the person who will make the payment)
            const payeeTransaction = yield transaction_services_1.default.createTransaction(Object.assign({ userId: payeeId, amount: amount, description: `Payment of ${amount} ${currency.toUpperCase()} via STRIPE: ${description}`, type: client_1.TransactionType.DEBIT, status: client_1.TransactionStatus.PENDING, reference: client_1.TransactionReference.MAKE_PAYMENT, walletId: payeeWallet.id, referenceId: referenceId, paymentGateway: client_1.PaymentGateway.STRIPE }, (client_1.PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId })));
            // Create a pending transaction for the creator (the person who will receive the payment)
            yield transaction_services_1.default.createTransaction(Object.assign({ userId: creatorId, amount: amount, description: `Pending receipt of ${amount} ${currency.toUpperCase()} via STRIPE: ${description}`, type: client_1.TransactionType.CREDIT, status: client_1.TransactionStatus.PENDING, reference: client_1.TransactionReference.RECEIVE_PAYMENT, walletId: creatorWallet.id, referenceId: referenceId, paymentGateway: client_1.PaymentGateway.STRIPE }, (client_1.PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId })));
            return {
                paymentDetails: paymentResponse,
                transactionDetails: payeeTransaction,
                paymentUrl: paymentUrl,
            };
        });
    }
    getMonthlyAnalysis(month, year, propertyId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const transactions = yield __1.prismaClient.transaction.findMany({
                where: {
                    propertyId,
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            let totalRevenue = 0;
            let totalExpenses = 0;
            let overduePayments = 0;
            transactions.forEach((transaction) => {
                if (transaction.reference === 'RENT_PAYMENT') {
                    totalRevenue += transaction.amount.toNumber();
                }
                else if (transaction.reference === 'MAINTENANCE_FEE' ||
                    transaction.reference === 'BILL_PAYMENT' ||
                    transaction.reference === 'LATE_FEE' ||
                    transaction.reference === 'CHARGES') {
                    totalExpenses += transaction.amount.toNumber();
                }
            });
            // Fetch overdue payments
            // const overdueTransactions = await prismaClient.transaction.findMany({
            //     where: {
            //         propertyId,
            //         userId,
            //         nextDueDate: {
            //             lt: new Date(), // Past due date
            //         },
            //     },
            // });
            // overduePayments = overdueTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
            return {
                totalRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                overduePayments,
            };
        });
    }
    getIncomeStatistics(propertyId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const monthlyPayments = [];
            const currentYear = new Date().getFullYear();
            for (let month = 1; month <= 12; month++) {
                const startDate = new Date(currentYear, month - 1, 1);
                const endDate = new Date(currentYear, month, 0);
                const transactions = yield __1.prismaClient.transaction.findMany({
                    where: {
                        propertyId,
                        userId,
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                        status: client_1.TransactionStatus.COMPLETED,
                    },
                });
                let totalRentPayments = 0;
                let totalLateFees = 0;
                let totalCharges = 0;
                transactions.forEach((transaction) => {
                    if (transaction.reference === 'RENT_PAYMENT') {
                        totalRentPayments += transaction.amount.toNumber();
                    }
                    else if (transaction.reference === 'LATE_FEE') {
                        totalLateFees += transaction.amount.toNumber();
                    }
                    else if (transaction.reference === 'CHARGES') {
                        totalCharges += transaction.amount.toNumber();
                    }
                });
                monthlyPayments.push({
                    month,
                    totalRentPayments,
                    totalLateFees,
                    totalCharges,
                });
            }
            return monthlyPayments;
        });
    }
    createBudget(propertyId, transactionType, budgetAmount, frequency) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.budget.create({
                data: {
                    propertyId,
                    transactionType,
                    budgetAmount,
                    frequency,
                },
            });
        });
    }
    checkAlerts(budget, currentAmount) {
        const budgetReached = currentAmount >= budget.budgetAmount;
        const alertThreshold = budget.budgetAmount * budget.alertThreshold;
        if (budgetReached) {
            console.log(`Budget for ${budget.transactionType} has been reached.`);
            // Send alert notification
        }
        else if (currentAmount >= alertThreshold) {
            console.log(`Warning: You are approaching the budget limit for ${budget.transactionType}.`);
            // Send warning notification
        }
    }
    updateBudget(id, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const budget = yield __1.prismaClient.budget.findUnique({ where: { id } });
            if (!budget)
                throw new Error('Budget not found');
            const newCurrentAmount = budget.currentAmount + amount;
            yield __1.prismaClient.budget.update({
                where: { id },
                data: { currentAmount: newCurrentAmount },
            });
            this.checkAlerts(budget, newCurrentAmount);
        });
    }
}
exports.default = new FinanceService();
