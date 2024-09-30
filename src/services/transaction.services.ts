import { TransactionStatus, TransactionType, PaymentGateway, TransactionReference } from "@prisma/client";
import { prismaClient } from "..";
import { WebHookData } from "../utils/types";
import { randomBytes } from 'crypto';

class TransactionService {
    async createTransaction(transactionData: {
        description: string;
        amount: number;
        userId: string;
        walletId?: string;
        type: TransactionType;
        reference: TransactionReference;
        status: TransactionStatus;
        referenceId: string;
        paymentGateway?: PaymentGateway;
        stripePaymentIntentId?: string;
        propertyId?: string;
        apartmentId?: string;
        billId?: string;
    }) {
        return prismaClient.transaction.create({
            data: transactionData,
        });
    }

    async getTransactionsByUser(userId: string) {
        return prismaClient.transaction.findMany({
            where: {
                userId
            },
        });
    }

    async getTransactionById(id: string) {
        return prismaClient.transaction.findUnique({
            where: {
                id
            },
        });
    }

    async getTransactionByReference(referenceId: string) {
        return prismaClient.transaction.findFirst({
            where: {
                referenceId
            },
        });
    }

    async updateTransaction(transactionId: string, userId: string, transactionData: Partial<{
        description: string;
        amount: number;
        type: TransactionType;
        reference: TransactionReference;
        status: TransactionStatus;
        paymentGateway?: PaymentGateway;
        stripePaymentIntentId?: string;
    }>) {
        return prismaClient.transaction.update({
            where: {
                id: transactionId,
                userId
            },
            data: transactionData,
        });
    }

    async updateReferenceTransaction(userId: string) {
        console.log("got here");
        return prismaClient.transaction.update({
            where: {
                userId
            },
            data: {
                status: TransactionStatus.COMPLETED,
            },
        });
    }

    async handleSuccessfulPayment(respData: WebHookData) {
        const transaction = await this.getTransactionByReference(respData.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updateTransaction(transaction.id, transaction.userId, {
            status: TransactionStatus.COMPLETED,
        });

        if (transaction.type === TransactionType.CREDIT && transaction.walletId) {
            //update the wallet balance
            await prismaClient.wallet.update({
                where: { id: transaction.walletId },
                data: {
                    balance: {
                        increment: transaction.amount,
                    }
                }
            });
        }
    }

    async handleFailedPayment(data: any) {
        const transaction = await this.getTransactionByReference(data.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updateTransaction(transaction.id, transaction.userId, {
            status: TransactionStatus.FAILED,
        });
    }

    async createCounterpartyTransaction(data: {
        userId: string;
        amount: number;
        description: string;
        reference: TransactionReference;
        walletId: string;
        propertyId?: string;
        apartmentId?: string;
        billId?: string;
    }) {
        return prismaClient.transaction.create({
            data: {
                ...data,
                type: TransactionType.CREDIT,
                status: TransactionStatus.COMPLETED,
                referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`,
            }
        });
    }
}

export default new TransactionService();