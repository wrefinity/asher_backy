import { TransactionStatus, TransactionType, PaymentGateway, TransactionReference, PrismaClient, Transaction } from "@prisma/client";
import { prismaClient } from "..";
import { WebHookData } from "../utils/types";
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { generateIDs } from "../utils/helpers";
import WalletService from "./wallet.service";
import { Decimal } from "@prisma/client/runtime/library";
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear
} from 'date-fns';
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
            billsSubCategory: data.billId ? { connect: { id: data.billId } } : undefined,
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
        currency?: string;
        referenceId: string;
        paymentGateway?: PaymentGateway;
        stripePaymentIntentId?: string;
        propertyId?: string;
        billId?: string;
        metadata?: object;
    }) => {
        return prismaClient.transaction.create({
            data: transactionData,
        });
    }

    async getTransactionStats(
        filter: 'today' | 'week' | 'month' | 'year' | 'total', // Added 'year'
        userId?: string,
        landlordId?: string,
        propertyId?: string
    ) {
        // Validate that only one of userId or landlordId is provided
        if (userId && landlordId) {
            throw new Error("Only one of userId or landlordId can be provided");
        }
        if (!userId && !landlordId) {
            throw new Error("Either userId or landlordId must be provided");
        }

        // Validate propertyId is only provided with landlordId
        if (propertyId && !landlordId) {
            throw new Error("propertyId can only be provided with landlordId");
        }

        // Base where clause
        const where: Prisma.TransactionWhereInput = {
            status: TransactionStatus.COMPLETED
        };

        // Apply user/landlord filter
        if (userId) {
            where.userId = userId;
        } else if (landlordId) {
            where.OR = [
                { property: { landlordId } },
                { userId: landlordId }
            ];
        }

        // Apply property filter if provided
        if (propertyId) {
            where.propertyId = propertyId;
        }

        // Apply time filters
        const now = new Date();
        switch (filter) {
            case 'today':
                where.createdAt = {
                    gte: startOfDay(now),
                    lte: endOfDay(now)
                };
                break;
            case 'week':
                where.createdAt = {
                    gte: startOfWeek(now),
                    lte: endOfWeek(now)
                };
                break;
            case 'month':
                where.createdAt = {
                    gte: startOfMonth(now),
                    lte: endOfMonth(now)
                };
                break;
            case 'year':
                where.createdAt = {
                    gte: startOfYear(now),
                    lte: endOfYear(now)
                };
                break;
            // 'total' needs no date filter
        }

        // Helper function to safely convert to Decimal
        const toDecimal = (value: Decimal | number | null | undefined): Decimal => {
            if (value instanceof Decimal) return value;
            if (typeof value === 'number') return new Decimal(value);
            return new Decimal(0);
        };

        // Get income (CREDIT transactions)
        const incomeResult = await prismaClient.transaction.aggregate({
            where: {
                ...where,
                type: 'CREDIT'
            },
            _sum: {
                amount: true
            },
            _count: {
                _all: true
            }
        });

        // Get spending (DEBIT transactions)
        const spendingResult = await prismaClient.transaction.aggregate({
            where: {
                ...where,
                type: 'DEBIT'
            },
            _sum: {
                amount: true
            },
            _count: {
                _all: true
            }
        });

        // Convert to Decimal safely
        const incomeTotal = toDecimal(incomeResult._sum.amount);
        const spendingTotal = toDecimal(spendingResult._sum.amount);
        const net = incomeTotal.minus(spendingTotal);

        // Get breakdown by transaction reference
        const breakdown = await prismaClient.transaction.groupBy({
            by: ['reference', 'type'],
            where,
            _sum: {
                amount: true
            },
            _count: {
                _all: true
            },
            orderBy: {
                _sum: {
                    amount: 'desc'
                }
            }
        });

        return {
            filter,
            userId,
            landlordId,
            propertyId,
            income: {
                total: incomeTotal,
                count: incomeResult._count._all
            },
            spending: {
                total: spendingTotal,
                count: spendingResult._count._all
            },
            net,
            breakdown: breakdown.map(item => ({
                reference: item.reference,
                type: item.type,
                total: toDecimal(item._sum.amount),
                count: item._count._all
            }))
        };
    }

    async getTransactionsByUser(
        userId: string,
        value: any
    ) {

        const {
            page,
            limit,
            type,
            reference,
            status,
            paymentGateway,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            search,
            propertyId,
            unitId,
            roomId,
            billId,
            walletId,
            isDue,
            sortBy,
            sortOrder,
            frequency,
        } = value;

        // Base where clause
        const where: Prisma.TransactionWhereInput = {
            userId
        };

        // Add filters (same as before but without landlord/property checks)
        if (type) where.type = type;
        if (reference) where.reference = reference;
        if (status) where.status = status;
        if (paymentGateway) where.paymentGateway = paymentGateway;
        if (isDue !== undefined) where.isDue = isDue;
        if (propertyId) where.propertyId = propertyId;
        if (unitId) where.unitId = unitId;
        if (roomId) where.roomId = roomId;
        // if (billId) where.billId = billId;
        if (walletId) where.walletId = walletId;

        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
            };
        }

        // Amount range filter
        if (minAmount !== undefined || maxAmount !== undefined) {
            where.amount = {
                ...(minAmount !== undefined ? { gte: new Prisma.Decimal(minAmount) } : {}),
                ...(maxAmount !== undefined ? { lte: new Prisma.Decimal(maxAmount) } : {}),
            };
        }

        // Search filter
        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { referenceId: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Get total count for pagination
        const total = await prismaClient.transaction.count({ where });

        // Get paginated results
        const transactions = await prismaClient.transaction.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder
            },
            include: {
                property: true,
                wallet: true,
                billsSubCategory: true,
                unit: true,
            }
        });

        return {
            data: transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1
            }
        };
    }
    async getTransactionsByProps(
        filters: {
            propertyId?: string | null,
            landlordId?: string | null,
            [key: string]: any
        },
        value: any
    ) {
        // Merge filters and value with proper defaults
        const params = {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...filters,
            ...value
        };

        // Destructure with defaults
        const {
            propertyId = null,
            landlordId = null,
            page,
            limit,
            type = null,
            reference = null,
            status = null,
            paymentGateway = null,
            startDate = null,
            endDate = null,
            minAmount = null,
            maxAmount = null,
            search = null,
            unitId = null,
            roomId = null,
            billId = null,
            walletId = null,
            userId = null,
            isDue = null,
            sortBy,
            sortOrder,
            frequency = null,
            payableBy = null
        } = params;

        // Base where clause
        const where: Prisma.TransactionWhereInput = {};

        // Add property filter if propertyId exists
        if (propertyId && landlordId) {
            where.property = {
                id: propertyId,
                ...(landlordId ? { landlordId } : {}),
            };
        } else if (landlordId && !propertyId && !userId) {
            // If no propertyId but landlordId exists, show all landlord's transactions
            where.OR = [
                { property: { landlordId } }
            ];
        }

        // Add filters with null checks
        if (type) where.type = type;
        if (reference) where.reference = reference;
        if (status) where.status = status;
        if (paymentGateway) where.paymentGateway = paymentGateway;
        if (isDue !== null) where.isDue = isDue;
        if (unitId) where.unitId = unitId;
        if (roomId) where.roomId = roomId;
        // if (billId) where.billId = billId;
        if (walletId) where.walletId = walletId;
        if (userId) where.userId = userId;

        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
            };
        }

        // Amount range filter
        if (minAmount !== null || maxAmount !== null) {
            where.amount = {
                ...(minAmount !== null ? { gte: new Prisma.Decimal(minAmount) } : {}),
                ...(maxAmount !== null ? { lte: new Prisma.Decimal(maxAmount) } : {}),
            };
        }

        // Search filter
        if (search) {
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { referenceId: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Bill-related filters
        // if (frequency || payableBy) {
        //     where.billsSubCategory = {
        //         ...(frequency ? { billFrequency: frequency } : {}),
        //         ...(payableBy ? { payableBy: payableBy } : {}),
        //     };
        // }

        // Get total count for pagination
        const total = await prismaClient.transaction.count({ where });

        // Get paginated results
        const transactions = await prismaClient.transaction.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder
            },
            include: {
                property: propertyId ? {
                    select: {
                        id: true,
                        name: true
                    }
                } : false,
                wallet: {
                    select: {
                        id: true,
                        currency: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: true
                    }
                },
                billsSubCategory: {
                    select: {
                        id: true,
                        billName: true,
                        billFrequency: true
                    }
                }
            }
        });

        return {
            data: transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1
            }
        };
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