import { TransactionStatus, TransactionType, PaymentGateway, TransactionReference, PrismaClient, Transaction } from "@prisma/client";
import { prismaClient } from "..";
import { WebHookData } from "../utils/types";
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { generateIDs } from "../utils/helpers";
import WalletService from "./wallet.service";
import { Decimal } from "@prisma/client/runtime/library";


export interface TransactionIF {
    id?: string;
    description?: string | null;
    amount: Decimal; // Decimal is typically represented as a number in TypeScript
    userId: string;
    walletId?: string | null;
    type?: TransactionType;
    reference: TransactionReference;
    status?: TransactionStatus;
    referenceId: string;
    paymentGateway?: PaymentGateway | null; // Assuming `PaymentGateway` is an enum or union type
    stripePaymentIntentId?: string | null;
    propertyId?: string | null;
    billId?: string | null;
    currency?: string | null;
    metadata?: object
}

class TransactionService {

    createTransact = async (data: TransactionIF, landlordId: string = null) => {

        // 1. check for sufficient balance
        await WalletService.ensureSufficientBalance(data.walletId, data.userId, new Decimal(data.amount))

        // 2. check if the landlord has an account for this transaction same with the tenant
        const landlordWalletExitForSameCurrency = await WalletService.getUserWallet(landlordId, data.currency)

        if (!landlordWalletExitForSameCurrency)
            throw new Error("The landlord does not have same currency wallet, contact the landlord for the exact currency exchange wallet to use")

        // Map TransactionIF to Prisma's TransactionCreateInput
        const prismaData: Prisma.TransactionCreateInput = {
            id: data.id,
            description: data.description,
            amount: data.amount,
            user: { connect: { id: data.userId } },
            wallet: data.walletId ? { connect: { id: data.walletId } } : undefined,
            type: data.type ? data.type : TransactionType.DEBIT,
            reference: data.reference,
            status: data.status ? data.status : TransactionStatus.PENDING, // Initial status (e.g., PENDING)
            referenceId: data.referenceId ? data.referenceId : generateIDs(`RF-${data.reference}`),
            paymentGateway: data.paymentGateway,
            stripePaymentIntentId: data.stripePaymentIntentId,
            property: data.propertyId ? { connect: { id: data.propertyId } } : undefined,
            bill: data.billId ? { connect: { id: data.billId } } : undefined,
            currency: data.currency,
        };

        // Create the transaction
        const transaction = await prismaClient.transaction.create({
            data: prismaData,
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Update the wallet balance
        if (transaction.walletId) {
            await prismaClient.wallet.update({
                where: { id: transaction.walletId },
                data: {
                    balance: {
                        decrement: transaction.amount,
                    },
                },
            });

            // Update the transaction status to COMPLETED
            await prismaClient.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED, // Update status to COMPLETED
                },
            });
        }

        return transaction;
    };

    createTransaction = async (transactionData: {
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
        billId?: string;
    }) => {
        return prismaClient.transaction.create({
            data: transactionData,
        });
    }

    getTransactionsByUser = async (userId: string) => {
        return prismaClient.transaction.findMany({
            where: {
                userId
            },
        });
    }
    getTransactionByProps = async (propertyId: string, landlordId: string = null) => {
        return prismaClient.transaction.findMany({
            where: {
                property: {
                    id: propertyId,
                    ...(landlordId ? { landlordId } : {}),
                }
            },
        });
    }

    getTransactionById = async (id: string) => {
        return prismaClient.transaction.findUnique({
            where: {
                id
            },
        });
    }

    getTransactionByReference = async (referenceId: string) => {
        return prismaClient.transaction.findFirst({
            where: {
                referenceId
            },
        });
    }

    updateTransaction = async (transactionId: string, userId: string, transactionData: Partial<{
        description: string;
        amount: number;
        type: TransactionType;
        reference: TransactionReference;
        status: TransactionStatus;
        paymentGateway?: PaymentGateway;
        stripePaymentIntentId?: string;
    }>) => {
        return prismaClient.transaction.update({
            where: {
                id: transactionId,
                userId
            },
            data: transactionData,
        });
    }
    // TODO: 
    // updateReferenceTransaction = async (userId: string) => {
    //     console.log("got here");
    //     return prismaClient.transaction.update({
    //         where: {
    //             userId
    //         },
    //         data: {
    //             status: TransactionStatus.COMPLETED,
    //         },
    //     });
    // }

    handleSuccessfulPayment = async (respData: WebHookData) => {
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

    handleFailedPayment = async (data: any) => {
        const transaction = await this.getTransactionByReference(data.reference);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        await this.updateTransaction(transaction.id, transaction.userId, {
            status: TransactionStatus.FAILED,
        });
    }

    createCounterpartyTransaction = async (data: {
        userId: string;
        amount: number;
        description: string;
        reference: TransactionReference;
        walletId: string;
        propertyId?: string;
        billId?: string;
    }) => {
        return prismaClient.transaction.create({
            data: {
                ...data,
                type: TransactionType.CREDIT,
                status: TransactionStatus.COMPLETED,
                referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`,
            }
        });
    }

    async updateTransactionStatus(
        reference: string,
        status: TransactionStatus,
        metadata?: any
    ): Promise<Transaction> {
        return prismaClient.transaction.update({
            where: { referenceId: reference },
            data: {
                status,
                metadata: metadata ? { ...metadata } : undefined,
            },
        });
    }
}

export default new TransactionService();