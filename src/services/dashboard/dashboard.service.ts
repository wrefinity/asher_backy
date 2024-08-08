import { creditScore, PropertyTransactions, PropertyTransactionsType, Transactions, TransactionStatus, users } from "@prisma/client";

import { Decimal } from "@prisma/client/runtime/library";
import { prismaClient } from "../..";
import { Redis } from 'ioredis';

import Queue from 'bull';

const redis = new Redis();
const dashboardUpdateQueue = new Queue('dashboardUpdates');

interface DashboardData {
    userCreditScore: (creditScore & { user: users }) | null;
    propertyPaymentDetails: PropertyTransactions[];
    transactionDetails: (Transactions & { wallet: { id: string } })[]
    rentStatus: RentStatus;
    totalDueBills: Decimal;
    totalDuePayments: Decimal;
}

interface RentStatus {
    isOverdue: boolean;
    daysUntilDue: number;
    daysOverDue?: number;
    minDuePayments: number;
}

class DashboardService {

    private static CACHE_TTL = 60 * 60
    constructor() {}

    async initializeBagroundJobs() {
        dashboardUpdateQueue.process(async (job) => {
            const userId = job.data.userId;
            try {
                await this.dashboardDetails(userId);
            } catch (error) {
                console.error(`Error updating dashboard for user ${userId}:`, error);
            }
        });
        try {
            const users = await prismaClient.users.findMany({ select: { id: true } })
        users.forEach((user) => {
            dashboardUpdateQueue.add({ userId: user.id }, { repeat: { cron: '0 0 * * *' } })
        })
        } catch (error) {
            console.error("Error updating", error)
        }
        
    }
    async dashboardDetails(userId: string): Promise<DashboardData> {

        try {
            const [userCreditScore, propertyPaymentDetails, transactionDetails, tenant] = await Promise.all([
                prismaClient.creditScore.findUnique({
                    where: { userId },
                    include: {
                        user: true,
                    },
                }),
                prismaClient.propertyTransactions.findMany({
                    where: { tenantId: userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }),
                prismaClient.transactions.findMany({
                    where: { userId },
                    include: {
                        wallet: {
                            select: { id: true },
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }),
                prismaClient.tenants.findUnique({
                    where: { userId },
                    include: {
                        PropertyTransactions: {
                            orderBy: { nextDueDate: 'asc' },
                            take: 1
                        }
                    }
                }),
            ]);

            const rentStatus = await this.calculateRentStatus(tenant?.PropertyTransactions[0]);

            const [totalDueBills, totalDuePayments] = await Promise.all([
                this.calculateTotalDueBills(userId),
                this.calculateTotalDuePayments(userId),
            ])

            return {
                userCreditScore,
                propertyPaymentDetails,
                transactionDetails,
                rentStatus,
                totalDueBills,
                totalDuePayments,
            }
        } catch (error) {
            console.error("Error fetching dashboard details: ", error)
            throw new Error("Failed fetching details", error)
        }

    }

    async calculateRentStatus(latestTransaction: PropertyTransactions | undefined) {
        if (!latestTransaction) {
            return {
                isOverdue: false,
                daysUntilDue: 0,
                daysOverDue: 0,
                minDuePayments: 0,
            }
        }
        const now = new Date();
        const dueDate = new Date(latestTransaction.nextDueDate)
        const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        return {
            isOverdue: diffDays < 0,
            daysUntilDue: Math.max(0, diffDays),
            daysOverdue: Math.max(0, -diffDays),
            minDuePayments: latestTransaction.missedPayment,
        }

    }

    async calculateTotalDueBills(userId: string): Promise<Decimal> {
        const dueBills = await prismaClient.propertyTransactions.aggregate({
            where: {
                tenantId: userId,
                type: PropertyTransactionsType.MAINTAINACE_FEE,
                transactionStatus: TransactionStatus.PENDING,
                nextDueDate: { lte: new Date() },
            },
            _sum: { amount: true },
        })
        return dueBills._sum.amount || new Decimal(0);

    }

    async calculateTotalDuePayments(userId: string): Promise<Decimal> {
        const duePayments = await prismaClient.propertyTransactions.aggregate({
            where: {
                tenantId: userId,
                type: PropertyTransactionsType.RENT_DUE,
                transactionStatus: TransactionStatus.PENDING,
                dueDate: { lte: new Date() },
            },
            _sum: { amount: true },
        })
        return duePayments._sum.amount || new Decimal(0);


    }

    async returnDuePayments(userId: string) {
        const [nativeTransactionDue, propertyTransactionDue] = await Promise.all([
            prismaClient.transactions.findMany({
                where: {
                    userId,
                    transactionStatus: TransactionStatus.PENDING,
                },
                include: {
                    wallet: true
                },
            }),

            // property Transaction
            prismaClient.propertyTransactions.findMany({
                where: {
                    tenantId: userId,
                    transactionStatus: TransactionStatus.PENDING,
                    nextDueDate: { lte: new Date() },
                },
            })
        ])

        return {
            nativeTransactionDue,
            propertyTransactionDue,
        }
    }

    // async updatedashboardData(userId: string): Promise<void> {
    //     await this.dashboardDetails(userId);
    // }

    async getDashboardData(userId: string): Promise<DashboardData> {
        const cachedData = await redis.get(`dashboard:${userId}`);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const dashboardData = await this.dashboardDetails(userId);
        await redis.set(`dashboard:${userId}`, JSON.stringify(dashboardData), 'EX', DashboardService.CACHE_TTL)
        return dashboardData;
    }
}

export default new DashboardService();;
