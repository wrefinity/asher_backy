import { PrismaClient, TransactionStatus } from "@prisma/client";
import { prismaClient } from "..";
import { WebHookData, WebhookEventResponse } from "../utils/types";

class TransactionService {
    async createTransaction(transactionData: any){
        return prismaClient.transactions.create({
            data: transactionData,
        })
    }

    async getTransactionsByUser(userId: string) {
        return prismaClient.transactions.findMany({
            where: {
                userId
            },
        })
    }

    async getTransactionById(id: string) {
        return prismaClient.transactions.findUnique({
            where: {
                id
            },
        })
    }

    async getTransactionByReference(referenceId: string) {
        return prismaClient.transactions.findUnique({
            where: {
                referenceId
            },
        })
    }

    async updateTransaction(transactionId: string, userId: string, transactionData: any) {
        return prismaClient.transactions.update({
            where: {
                id: transactionId,
                userId
            },
            data: transactionData,
        })
    }

    async updateReferneceTransaction(referenceId: string, userId:string){
        console.log("got here")
        return prismaClient.transactions.update({
            where: {
                referenceId,
                userId
            },
            data: {
                referenceId,
                transactionStatus: TransactionStatus.COMPLETED,
            },
        })
    }

    async handleSuccessfulPayment(respData: WebHookData) {
        const transaction = await this.getTransactionByReference(respData.reference)
        if (!transaction) {
            throw new Error('Transaction not found')
        }
        await this.updateTransaction(transaction.id, transaction.userId, {
            transactionStatus: TransactionStatus.COMPLETED,
        })

        //update the wallet balance
        await prismaClient.wallet.update({
            where: { id: transaction.walletId },
            data: {
                balance: {
                    increment: transaction.amount,
                }
            }
        })
    }

    async handleFailedPayment(data: any) {
        const transaction = await this.getTransactionByReference(data.reference)
        if (!transaction) {
            throw new Error('Transaction not found')
        }
        await this.updateTransaction(transaction.id, transaction.userId, {
            transactionStatus: TransactionStatus.FAILED,
        })
    }

}

export default new TransactionService();