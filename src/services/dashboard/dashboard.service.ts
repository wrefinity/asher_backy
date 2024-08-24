import { creditScore, PropertyTransactions, PropertyTransactionsType, Transactions, TransactionStatus, users } from "@prisma/client";

import { Decimal } from "@prisma/client/runtime/library";
import { prismaClient } from "../..";

import Queue from 'bull';
import RedisService from "../utilsServices/redis.service";



const dashboardUpdateQueue = new Queue('dashboardUpdates');

interface DashboardData {
    userCreditScore: (creditScore & { user: users }) | any;
    propertyPaymentDetails: PropertyTransactions[];
    transactionDetails: (Transactions)[]
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
            const [userCreditScore, propertyPaymentDetails, transactionDetails, tenant] = await Promise.all([
                prismaClient.creditScore.findUnique({
                    where: { userId },
                    select: {
                        score: true,
                    },
                }),
                prismaClient.propertyTransactions.findMany({
                    where: { tenantId: userId },
                    orderBy: { paidDate: 'desc' },
                    take: 10
                }),
                prismaClient.transactions.findMany({
                    where: { userId },
                    include: {
                        
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
            console.log(`Rent status ${rentStatus}`);
            const [totalDueBills, totalDuePayments] = await Promise.all([
                this.calculateTotalDueBills(userId),
                this.calculateTotalDuePayments(userId),
            ])

            return {
                userCreditScore: userCreditScore?.score,
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
                // dueDate: { lte: new Date() },
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

    async getDashboardData(userId: string): Promise<DashboardData> {
        try {
            const cachedData = await this.redisService.get(`dashboard:${userId}`);
            if (cachedData) {
                console.log(`Cache hit for user ${userId}`);
                return JSON.parse(cachedData);
            }

            console.log(`Cache miss for user ${userId}`);
            const dashboardData = await this.dashboardDetails(userId);
            await this.redisService.set(`dashboard:${userId}`, JSON.stringify(dashboardData), DashboardService.CACHE_TTL);
            return dashboardData;
        } catch (error) {
            console.error('Error with Redis operation:', error);
            throw error;
        }
    }

}

const redisService = new RedisService()
const dashboardService = new DashboardService(redisService);
export default dashboardService;
