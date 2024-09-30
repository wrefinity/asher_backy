// services/landlordTransaction.service.ts
import { TransactionReference, TransactionStatus } from "@prisma/client";
import { prismaClient } from "../..";
import { WebHookData } from "../../utils/types";


class LandlordTransactionService {
    async createPropertyTransaction(transactionData: any) {
        return prismaClient.transaction.create({
            data: {
                description: transactionData.description,
                amount: transactionData.amount,
                propertyId: transactionData.propertyId,  // Correctly link to existing property
                userId: transactionData.userId,
                status: transactionData.transactionStatus,
                type: transactionData.type,
                referenceId: transactionData.referenceId,
                reference: transactionData.reference,
            }
        });
    }
    

    async getPropertyTransactionById(id: string) {
        return prismaClient.transaction.findUnique({
            where: {
                id
            },
        });
    }

    async getPropertyTransactionsByLandlord(userId: string, propertyId: string) {
        return prismaClient.transaction.findMany({
            where: {
                userId: userId,
                propertyId: propertyId
            },
        });
    }

    async getPropertyTransactionByReference(referenceId: string) {
        return prismaClient.transaction.findFirst({
            where: {
                referenceId
            },
        });
    }

    async updatePropertyTransaction(transactionId: string, userId: string, transactionData: any) {
        return prismaClient.transaction.update({
            where: {
                id: transactionId,
                userId
            },
            data: transactionData,
        });
    }

    async handleSuccessfulPropertyPayment(respData: WebHookData) {
        const transaction = await this.getPropertyTransactionByReference(respData.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updatePropertyTransaction(transaction.id, transaction.userId, {
            transactionStatus: TransactionStatus.COMPLETED,
        });

        // Handle any additional logic specific to landlord transactions here
    }

    async handleFailedPropertyPayment(data: any) {
        const transaction = await this.getPropertyTransactionByReference(data.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updatePropertyTransaction(transaction.id, transaction.userId, {
            transactionStatus: TransactionStatus.FAILED,
        });
    }

    async getTransactionSummary(userId: string) {
        const transactions = await prismaClient.transaction.aggregate({
            where: {
                userId,
            },
            _sum: {
                amount: true
            },
            _count: {
                id: true
            },
        });

        const totalIncome = await prismaClient.transaction.aggregate({
            where: {
                userId,
                reference: {
                    in: [
                        TransactionReference.RENT_PAYMENT,
                        TransactionReference.BILL_PAYMENT
                    ]
                }
            },
            _sum: {
                amount: true
            }
        });

        const totalExpenses = await prismaClient.transaction.aggregate({
            where: {
                userId,
                reference: {
                    in: [
                        TransactionReference.MAINTENANCE_FEE,
                        TransactionReference.LANDLORD_PAYOUT
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
