import { BudgetFrequency, PaymentGateway, TransactionReference, TransactionStatus, TransactionType } from '@prisma/client';
import { prismaClient } from "../..";
import transactionServices from '../../services/transaction.services';
// import paystackServices from '../../services/paystack.services';
import { generateIDs } from '../../utils/helpers';
import flutterWaveService from '../../services/flutterWave.service';
import stripeService from '../../services/stripe.service';
import paymentGatewayService from '../../services/paymentGateway.service';
import walletService from '../../services/wallet.service';

class FinanceService {
    async getFinanceIncome(userId: string, year?: number) {
        const filterYear = year || new Date().getFullYear();
        const startDate = new Date(filterYear, 0, 1);
        const endDate = new Date(filterYear + 1, 0, 1);
        return await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: { in: [TransactionReference.RENT_PAYMENT, TransactionReference.LATE_FEE, TransactionReference.CHARGES, TransactionReference.MAINTENANCE_FEE] },
                createdAt: { gte: startDate, lt: endDate },
            },
            include: { property: true }
        });
    }

    async getFInanceExpense(userId: string, year?: number) {
        const filterYear = year || new Date().getFullYear();
        const startDate = new Date(filterYear, 0, 1);
        const endDate = new Date(filterYear + 1, 0, 1);
        return await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: { in: [TransactionReference.MAINTENANCE_FEE, TransactionReference.BILL_PAYMENT, TransactionReference.SUPPLIES, TransactionReference.EQUIPMENTS, TransactionReference.LATE_FEE, TransactionReference.CHARGES] },
                createdAt: { gte: startDate, lt: endDate },
            },
            include: { property: true }
        });
    }

    async getAllFinanceTransaction(userId: string) {
        return await prismaClient.transaction.findMany({
            where: {
                userId,
            },
            include: {
                property: true
            }
        })
    }


    async generatePaymentLink(payeeId: string, creatorId: string, amount: number, currency: string = 'usd', countryCode: string, expirationDate: Date, description: string, email: string) {
        const creator = await prismaClient.users.findUnique({ where: { id: creatorId } });
        const payee = await prismaClient.users.findUnique({ where: { id: payeeId } });

        if (!creator || !payee) {
            throw new Error('Creator or payee not found');
        }

        const creatorWallet = await walletService.getOrCreateWallet(creatorId, currency);
        const payeeWallet = await walletService.getOrCreateWallet(payeeId, currency);

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

        const stripeCustomer = await stripeService.createOrGetStripeCustomer(payeeId);
        //TODO: Check minutes here
        const payment = await stripeService.createPaymentLink(amount * 100, currency, stripeCustomer.id, 160);
        paymentUrl = payment.url;
        referenceId = payment.id;

        // Create a transaction for the payee (the person who will make the payment)
        const payeeTransaction = await transactionServices.createTransaction({
            userId: payeeId,
            amount: amount,
            description: `Payment of ${amount} ${currency.toUpperCase()} via STRIPE: ${description}`,
            type: TransactionType.DEBIT,
            status: TransactionStatus.PENDING,
            reference: TransactionReference.MAKE_PAYMENT,
            walletId: payeeWallet.id,
            referenceId: referenceId,
            paymentGateway: PaymentGateway.STRIPE,
            ...(PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId }),
        });

        // Create a pending transaction for the creator (the person who will receive the payment)
        await transactionServices.createTransaction({
            userId: creatorId,
            amount: amount,
            description: `Pending receipt of ${amount} ${currency.toUpperCase()} via STRIPE: ${description}`,
            type: TransactionType.CREDIT,
            status: TransactionStatus.PENDING,
            reference: TransactionReference.RECEIVE_PAYMENT,
            walletId: creatorWallet.id,
            referenceId: referenceId,
            paymentGateway: PaymentGateway.STRIPE,
            ...(PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId }),
        });

        return {
            paymentDetails: paymentResponse,
            transactionDetails: payeeTransaction,
            paymentUrl: paymentUrl,
        };
    }

    async getMonthlyAnalysis(month: number, year: number, propertyId: string, userId: string) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await prismaClient.transaction.findMany({
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
            } else if (
                transaction.reference === 'MAINTENANCE_FEE' ||
                transaction.reference === 'BILL_PAYMENT' ||
                transaction.reference === 'LATE_FEE' ||
                transaction.reference === 'CHARGES'
            ) {
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
    }

    async getIncomeStatistics(propertyId: string, userId: string) {
        const monthlyPayments = [];
        const currentYear = new Date().getFullYear();

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(currentYear, month - 1, 1);
            const endDate = new Date(currentYear, month, 0);

            const transactions = await prismaClient.transaction.findMany({
                where: {
                    propertyId,
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: TransactionStatus.COMPLETED,
                },
            });

            let totalRentPayments = 0;
            let totalLateFees = 0;
            let totalCharges = 0;

            transactions.forEach((transaction) => {
                if (transaction.reference === 'RENT_PAYMENT') {
                    totalRentPayments += transaction.amount.toNumber();
                } else if (transaction.reference === 'LATE_FEE') {
                    totalLateFees += transaction.amount.toNumber();
                } else if (transaction.reference === 'CHARGES') {
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
    }

    async createBudget(propertyId: string, transactionType: TransactionReference, budgetAmount: number, frequency: BudgetFrequency) {
        return await prismaClient.budget.create({
            data: {
                propertyId,
                transactionType,
                budgetAmount,
                frequency,
            },
        });
    }

    checkAlerts(budget: any, currentAmount: number) {
        const budgetReached = currentAmount >= budget.budgetAmount;
        const alertThreshold = budget.budgetAmount * budget.alertThreshold;

        if (budgetReached) {
            console.log(`Budget for ${budget.transactionType} has been reached.`);
            // TODO: Send alert notification
        } else if (currentAmount >= alertThreshold) {
            console.log(`Warning: You are approaching the budget limit for ${budget.transactionType}.`);
            // TODO: Send warning notification
        }
    }

    async updateBudget(id: string, amount: number) {
        const budget = await prismaClient.budget.findUnique({ where: { id } });
        if (!budget) throw new Error('Budget not found');

        const newCurrentAmount = budget.currentAmount + amount;

        await prismaClient.budget.update({
            where: { id },
            data: { currentAmount: newCurrentAmount },
        });

        this.checkAlerts(budget, newCurrentAmount);
    }

    async getIncomeBreakdown(userId: string, year?: number) {
        const filterYear = year || new Date().getFullYear();
        const result = [];
        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(filterYear, month - 1, 1);
            const endDate = new Date(filterYear, month, 1);
            const transactions = await prismaClient.transaction.findMany({
                where: {
                    userId,
                    createdAt: { gte: startDate, lt: endDate },
                    reference: { in: [TransactionReference.RENT_PAYMENT, TransactionReference.LATE_FEE, TransactionReference.CHARGES] },
                    status: TransactionStatus.COMPLETED,
                    type: TransactionType.CREDIT,
                },
            });
            let rent = 0, late_fees = 0, charges = 0;
            transactions.forEach(t => {
                if (t.reference === 'RENT_PAYMENT') rent += Number(t.amount);
                if (t.reference === 'LATE_FEE') late_fees += Number(t.amount);
                if (t.reference === 'CHARGES') charges += Number(t.amount);
            });
            result.push({ month, rent, late_fees, charges });
        }
        return result;
    }

    async getExpenseBreakdown(userId: string, year?: number) {
        const filterYear = year || new Date().getFullYear();
        const result = [];
        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(filterYear, month - 1, 1);
            const endDate = new Date(filterYear, month, 1);
            const transactions = await prismaClient.transaction.findMany({
                where: {
                    userId,
                    createdAt: { gte: startDate, lt: endDate },
                    reference: { in: [TransactionReference.MAINTENANCE_FEE, TransactionReference.SUPPLIES, TransactionReference.EQUIPMENTS] },
                    status: TransactionStatus.COMPLETED,
                    type: TransactionType.DEBIT,
                },
            });
            let maintenance = 0, supplies = 0, equipment = 0;
            transactions.forEach(t => {
                if (t.reference === 'MAINTENANCE_FEE') maintenance += Number(t.amount);
                if (t.reference === 'SUPPLIES') supplies += Number(t.amount);
                if (t.reference === 'EQUIPMENTS') equipment += Number(t.amount);
            });
            result.push({ month, maintenance, supplies, equipment });
        }
        return result;
    }

    async getStats(userId: string, year?: number) {
        const filterYear = year || new Date().getFullYear();
        const startDate = new Date(filterYear, 0, 1);
        const endDate = new Date(filterYear + 1, 0, 1);
        const revenue = await prismaClient.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                reference: { in: [TransactionReference.RENT_PAYMENT, TransactionReference.LATE_FEE, TransactionReference.CHARGES] },
                createdAt: { gte: startDate, lt: endDate },
                status: TransactionStatus.COMPLETED,
                type: TransactionType.CREDIT,
            },
        });
        const expenses = await prismaClient.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                reference: { in: [TransactionReference.MAINTENANCE_FEE, TransactionReference.BILL_PAYMENT, TransactionReference.SUPPLIES, TransactionReference.EQUIPMENTS, TransactionReference.LATE_FEE, TransactionReference.CHARGES] },
                createdAt: { gte: startDate, lt: endDate },
                status: TransactionStatus.COMPLETED,
                type: TransactionType.DEBIT,
            },
        });
        const outstanding = await prismaClient.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                reference: TransactionReference.RENT_DUE,
                status: TransactionStatus.PENDING,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
        return {
            totalRevenue: Number(revenue._sum.amount) || 0,
            totalExpenses: Number(expenses._sum.amount) || 0,
            netIncome: (Number(revenue._sum.amount) || 0) - (Number(expenses._sum.amount) || 0),
            outstandingRent: Number(outstanding._sum.amount) || 0,
        };
    }

    async getRecentTransactions(userId: string, limit = 5) {
        return await prismaClient.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async getUpcomingPayments(userId: string, limit = 5) {
        const now = new Date();
        return await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: { in: [TransactionReference.RENT_DUE, TransactionReference.BILL_PAYMENT] },
                status: TransactionStatus.PENDING,
                createdAt: { gte: now },
            },
            take: limit,
            orderBy: { createdAt: 'asc' },
        });
    }
}

export default new FinanceService();