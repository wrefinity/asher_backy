import { BudgetFrequency, PaymentGateway, PropertyTransactionsType, TransactionStatus, TransactionType } from '@prisma/client';
import { prismaClient } from "../..";
import transactionServices from '../../services/transaction.services';
import paystackServices from '../../services/paystack.services';
import { generateIDs } from '../../utils/helpers';
import flutterWaveService from '../../services/flutterWave.service';
import stripeService from '../../services/stripe.service';
import paymentGatewayService from '../../services/paymentGateway.service';
import walletService from '../../services/wallet.service';

class FinanceService {
    async getFinanceIncome(landlordId: string) {
        return await prismaClient.propertyTransactions.findMany({
            where: {

                landlordsId: landlordId,
                type: { in: [PropertyTransactionsType.RENT_PAYMENT, PropertyTransactionsType.LATE_FEE, PropertyTransactionsType.CHARGES, PropertyTransactionsType.MAINTAINACE_FEE] },
            },
            include: {
                properties: true
            }
        })
    }

    async getFInanceExpense(landlordId: string) {
        return await prismaClient.maintenance.findMany({
            where: {
                landlordId,
            },
            include: {
                property: true
            }
        })
    }

    async getAllFinanceTransaction(landlordId: string) {
        return await prismaClient.propertyTransactions.findMany({
            where: {
                landlordsId: landlordId,
            },
            include: {
                properties: true
            }
        })
    }


    async generatePaymentLink(id: string, amount: number, currency: string = 'usd', countryCode: string, expirationDate: Date, description: string, email:string) {
        const tenantUserId = await prismaClient.tenants.findUnique({ where: { id } })
        const wallet = await walletService.getOrCreateWallet(tenantUserId.userId);

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
        
        const stripeCustomer = await stripeService.createOrGetStripeCustomer(tenantUserId.userId);
                //TODO: Check minutes here
        const payment = await stripeService.createPaymentLink(amount * 100, currency, stripeCustomer.id, 160);
        paymentUrl = payment.url;
        referenceId = payment.id;
        
        const transaction = await transactionServices.createTransaction({
            userId: tenantUserId.userId,
            amount: amount,
            description: `Wallet funding of ${amount} ${currency.toUpperCase()} via STRIPE : ${description}`,
            transactionType: TransactionType.FUNDWALLET,
            transactionStatus: TransactionStatus.PENDING,
            walletId: wallet.id,
            referenceId: referenceId,
            paymentGateway: PaymentGateway.STRIPE,
            ...(PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId }),
        });

        return {
            paymentDetails: paymentResponse,
            transactionDetails: transaction,
            paymentUrl: paymentUrl, // Only for Flutterwave and Paystack
        };
    }

    async getMonthlyAnalysis(month: number, year: number, propertyId: string, landlordId: string) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await prismaClient.propertyTransactions.findMany({
            where: {
                propertyId,
                landlordsId: landlordId,
                paidDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        let totalRevenue = 0;
        let totalExpenses = 0;
        let overduePayments = 0;

        transactions.forEach((transaction) => {
            if (transaction.type === 'RENT_PAYMENT') {
                totalRevenue += transaction.amount.toNumber();
            } else if (
                transaction.type === 'MAINTAINACE_FEE' ||
                transaction.type === 'BILL_PAYMENT' ||
                transaction.type === 'LATE_FEE' ||
                transaction.type === 'CHARGES'
            ) {
                totalExpenses += transaction.amount.toNumber();
            }
        });

        // Fetch overdue payments
        const overdueTransactions = await prismaClient.propertyTransactions.findMany({
            where: {
                propertyId,
                landlordsId: landlordId,
                nextDueDate: {
                    lt: new Date(), // Past due date
                },
                transactionStatus: 'PENDING',
            },
        });

        overduePayments = overdueTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            overduePayments,
        };
    }

    async getIncomeStatistics(propertyId: string, landlordId: string) {
        const monthlyPayments = [];
        const currentYear = new Date().getFullYear();

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(currentYear, month - 1, 1);
            const endDate = new Date(currentYear, month, 0);

            const transactions = await prismaClient.propertyTransactions.findMany({
                where: {
                    propertyId,
                    landlordsId: landlordId,
                    paidDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                    transactionStatus: TransactionStatus.COMPLETED,
                },
            });

            let totalRentPayments = 0;
            let totalLateFees = 0;
            let totalCharges = 0;

            transactions.forEach((transaction) => {
                if (transaction.type === 'RENT_PAYMENT') {
                    totalRentPayments += transaction.amount.toNumber();
                } else if (transaction.type === 'LATE_FEE') {
                    totalLateFees += transaction.amount.toNumber();
                } else if (transaction.type === 'CHARGES') {
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

    async createBudget(propertyId: string, transactionType: PropertyTransactionsType, budgetAmount: number, frequency: BudgetFrequency) {
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
            // Send alert notification
        } else if (currentAmount >= alertThreshold) {
            console.log(`Warning: You are approaching the budget limit for ${budget.transactionType}.`);
            // Send warning notification
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
}

export default new FinanceService();