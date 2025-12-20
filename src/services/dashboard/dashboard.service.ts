import { creditScore, Transaction, TransactionReference, TransactionStatus, users } from '@prisma/client';

import { Decimal } from "@prisma/client/runtime/library";
import { prismaClient } from "../..";

import Queue from 'bull';
import RedisService from "../utilsServices/redis.service";



const dashboardUpdateQueue = new Queue('dashboardUpdates');

interface DashboardData {
    userCreditScore: (creditScore & { user: users }) | any;
    propertyPaymentDetails: Transaction[];
    transactionDetails: (Transaction)[]
    rentStatus: RentStatus | any;
    totalDueBills: Decimal;
    totalDuePayments: Decimal;
}
type RentStatus = {
    isOverdue: boolean;
    daysUntilDue: number;
    daysOverdue: number;
    minDuePayments: number | string; // depending on what `Transaction.status` is
};



class DashboardService {

    private static CACHE_TTL = 60 * 60

    constructor(private redisService: RedisService) { }

    async initializeBagroundJobs() {
        dashboardUpdateQueue.process(async (job) => {
            const userId = job.data.userId;
            console.log(`Started dashboard refetch update job ${userId}`)
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
        const [userCreditScore, propertyPaymentDetails, transactionDetails, tenants] = await Promise.all([
            prismaClient.creditScore.findUnique({
                where: { userId },
                select: { score: true },
            }),
            prismaClient.transaction.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            prismaClient.transaction.findMany({
                where: { userId },
                include: {
                    property: true,
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            prismaClient.tenants.findMany({
                where: { userId },
                include: {
                    property: true,
                    landlord: true,
                },
            }),
        ]);

        let rentStatus: RentStatus | null = null;
        if (tenants && tenants.length > 0) {
            const currentLease = tenants.find(t => t.isCurrentLease);
            if (currentLease) {
                // Pass a transaction instead of tenant.id
                const latestTransaction = await prismaClient.transaction.findFirst({
                    where: { userId, propertyId: currentLease.propertyId },
                    orderBy: { createdAt: "desc" },
                });
                rentStatus = await this.calculateRentStatus(latestTransaction ?? undefined);
            }
        }

        const [totalDueBills, totalDuePayments] = await Promise.all([
            this.calculateTotalDueBills(userId),
            this.calculateTotalDuePayments(userId),
        ]);

        return {
            userCreditScore: userCreditScore?.score ?? null,
            propertyPaymentDetails,
            transactionDetails,
            rentStatus, // now it’s an object, not a string
            totalDueBills,
            totalDuePayments,
        };
    } catch (error) {
        console.error("Error fetching dashboard details: ", error);
        throw new Error("Failed fetching details: " + error);
    }
}



async calculateRentStatus(latestTransaction: Transaction | undefined): Promise<RentStatus> {
    if (!latestTransaction) {
        return {
            isOverdue: false,
            daysUntilDue: 0,
            daysOverdue: 0,
            minDuePayments: 0,
        };
    }

    const now = new Date();
    const dueDate = new Date(); // replace with latestTransaction.property?.nextDueDate
    const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    return {
        isOverdue: diffDays < 0,
        daysUntilDue: Math.max(0, diffDays),
        daysOverdue: Math.max(0, -diffDays),
        minDuePayments: latestTransaction.status, // adjust if this is enum/string
    };
}

    async calculateTotalDueBills(userId: string): Promise<Decimal> {
        const dueBills = await prismaClient.transaction.aggregate({
            where: {
                userId: userId,
                reference: TransactionReference.MAINTENANCE_FEE,
                status: TransactionStatus.PENDING,
                // nextDueDate: { lte: new Date() },
            },
            _sum: { amount: true },
        })
        return dueBills._sum.amount || new Decimal(0);

    }

    async calculateTotalDuePayments(userId: string): Promise<Decimal> {
        const duePayments = await prismaClient.transaction.aggregate({
            where: {
                userId: userId,
                reference: TransactionReference.RENT_DUE,
                status: TransactionStatus.PENDING,
                // dueDate: { lte: new Date() },
            },
            _sum: { amount: true },
        })
        return duePayments._sum.amount || new Decimal(0);


    }

    async returnDuePayments(userId: string) {
        const [nativeTransactionDue, propertyTransactionDue] = await Promise.all([
            prismaClient.transaction.findMany({
                where: {
                    userId,
                    status: TransactionStatus.PENDING,
                },
                include: {

                },
            }),

            // property Transaction
            prismaClient.transaction.findMany({
                where: {
                    userId,
                    status: TransactionStatus.PENDING,
                    // nextDueDate: { lte: new Date() },
                },
            })
        ])

        return {
            nativeTransactionDue,
            propertyTransactionDue,
        }
    }

    async getDashboardData(userId: string): Promise<DashboardData> {
        try {
            // Try to get cached data, but don't fail if Redis is unavailable
            let cachedData = null;
            try {
                if (this.redisService) {
                    cachedData = await this.redisService.get(`dashboard:${userId}`);
                    if (cachedData) {
                        console.log(`Cache hit for user ${userId}`);
                        return JSON.parse(cachedData);
                    }
                }
            } catch (redisError) {
                console.warn('Redis cache read failed, continuing without cache:', redisError);
            }

            console.log(`Cache miss for user ${userId} - fetching fresh data`);
            const dashboardData = await this.dashboardDetails(userId);

            // Try to cache data, but don't fail if Redis is unavailable
            try {
                if (this.redisService) {
                    await this.redisService.set(`dashboard:${userId}`, JSON.stringify(dashboardData), DashboardService.CACHE_TTL);
                }
            } catch (redisError) {
                console.warn('Redis cache write failed, returning data anyway:', redisError);
            }

            return dashboardData;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }

}

const redisService = new RedisService()
const dashboardService = new DashboardService(redisService);
export default dashboardService;
