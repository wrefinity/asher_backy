// services/landlordTransaction.service.ts
import { PropertyTransactionsType, TransactionStatus } from "@prisma/client";
import { prismaClient } from "../..";
import { WebHookData } from "../../utils/types";


class LandlordTransactionService {
    async createPropertyTransaction(transactionData: any) {
        return prismaClient.propertyTransactions.create({
            data: {
                description: transactionData.description,
                amount: transactionData.amount,
                propertyId: transactionData.propertyId,  // Correctly link to existing property
                tenantId: transactionData.tenantId,
                transactionStatus: transactionData.transactionStatus,
                type: transactionData.type,
                referenceId: transactionData.referenceId,
                paidDate: transactionData.paidDate,
                landlordsId: transactionData.landlordsId,
            }
        });
    }
    

    async getPropertyTransactionById(id: string) {
        return prismaClient.propertyTransactions.findUnique({
            where: {
                id
            },
        });
    }

    async getPropertyTransactionsByLandlord(landlordId: string, propertyId: string) {
        return prismaClient.propertyTransactions.findMany({
            where: {
                landlordsId: landlordId,
                propertyId: propertyId
            },
        });
    }

    async getPropertyTransactionByReference(referenceId: string) {
        return prismaClient.propertyTransactions.findUnique({
            where: {
                referenceId
            },
        });
    }

    async updatePropertyTransaction(transactionId: string, landlordId: string, transactionData: any) {
        return prismaClient.propertyTransactions.update({
            where: {
                id: transactionId,
                landlordsId: landlordId
            },
            data: transactionData,
        });
    }

    async handleSuccessfulPropertyPayment(respData: WebHookData) {
        const transaction = await this.getPropertyTransactionByReference(respData.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updatePropertyTransaction(transaction.id, transaction.landlordsId, {
            transactionStatus: TransactionStatus.COMPLETED,
        });

        // Handle any additional logic specific to landlord transactions here
    }

    async handleFailedPropertyPayment(data: any) {
        const transaction = await this.getPropertyTransactionByReference(data.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updatePropertyTransaction(transaction.id, transaction.landlordsId, {
            transactionStatus: TransactionStatus.FAILED,
        });
    }

    async getTransactionSummary(landlordId: string) {
        const transactions = await prismaClient.propertyTransactions.aggregate({
            where: {
                landlordsId: landlordId,
            },
            _sum: {
                amount: true
            },
            _count: {
                id: true
            },
        });

        const totalIncome = await prismaClient.propertyTransactions.aggregate({
            where: {
                landlordsId: landlordId,
                type: {
                    in: [
                        PropertyTransactionsType.RENT_PAYMENT,
                        PropertyTransactionsType.BILL_PAYMENT
                    ]
                }
            },
            _sum: {
                amount: true
            }
        });

        const totalExpenses = await prismaClient.propertyTransactions.aggregate({
            where: {
                landlordsId: landlordId,
                type: {
                    in: [
                        PropertyTransactionsType.MAINTAINACE_FEE,
                        PropertyTransactionsType.LANDLORD_PAYOUT
                    ]
                }
            },
            _sum: {
                amount: true
            }
        });
        const incomeAmount = totalIncome._sum.amount ? parseFloat(totalIncome._sum.amount.toString()) : 0
        const expenseAmount = totalExpenses._sum.amount ? parseFloat(totalExpenses._sum.amount.toString()) : 0

        const netIncome = incomeAmount - expenseAmount;

        return {
            totalIncome: totalIncome._sum.amount || 0,
            totalExpenses: totalExpenses._sum.amount || 0,
            netIncome
        };
    }
}

export default new LandlordTransactionService();
