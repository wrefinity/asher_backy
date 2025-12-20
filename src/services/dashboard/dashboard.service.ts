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
                // Pass tenant and transaction to calculate rent status properly
                const latestTransaction = await prismaClient.transaction.findFirst({
                    where: { 
                        userId, 
                        propertyId: currentLease.propertyId,
                        reference: TransactionReference.RENT_PAYMENT,
                    },
                    orderBy: { createdAt: "desc" },
                });
                rentStatus = await this.calculateRentStatus(currentLease, latestTransaction ?? undefined);
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



async calculateRentStatus(tenant: any, latestTransaction: Transaction | undefined): Promise<RentStatus> {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

    // If no tenant data, return default
    if (!tenant || !tenant.dateOfFirstRent) {
        return {
            isOverdue: false,
            daysUntilDue: 0,
            daysOverdue: 0,
            minDuePayments: 0,
        };
    }

    // Calculate rent frequency based on lease duration
    const leaseStart = new Date(tenant.leaseStartDate || tenant.dateOfFirstRent);
    const leaseEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null;
    const leaseDuration = leaseEnd 
        ? Math.floor((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24))
        : 365; // Default to annual if no end date
    
    let rentFrequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
    if (leaseDuration <= 10) {
        rentFrequency = 'WEEKLY';
    } else if (leaseDuration <= 35) {
        rentFrequency = 'MONTHLY';
    } else {
        rentFrequency = 'ANNUAL';
    }

    // Calculate next due date based on dateOfFirstRent and frequency
    const firstRentDate = new Date(tenant.dateOfFirstRent);
    firstRentDate.setHours(0, 0, 0, 0);

    // Find the last rent payment date
    let lastPaymentDate: Date | null = null;
    if (latestTransaction && latestTransaction.createdAt) {
        lastPaymentDate = new Date(latestTransaction.createdAt);
        lastPaymentDate.setHours(0, 0, 0, 0);
    }

    // Calculate next due date
    // Start from dateOfFirstRent, then add periods based on frequency
    let nextDueDate = new Date(firstRentDate);
    
    if (lastPaymentDate && lastPaymentDate >= firstRentDate) {
        // If there's a payment, calculate next due date from last payment
        nextDueDate = new Date(lastPaymentDate);
    }

    // Add one period based on frequency
    if (rentFrequency === 'WEEKLY') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else if (rentFrequency === 'MONTHLY') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    } else { // ANNUAL
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    }

    // Ensure next due date is in the future
    while (nextDueDate <= now) {
        if (rentFrequency === 'WEEKLY') {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (rentFrequency === 'MONTHLY') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } else {
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }
    }

    // Calculate days difference
    const diffDays = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if there are any overdue periods
    // If the last payment was before the expected due date, rent might be overdue
    let isOverdue = false;
    let daysOverdue = 0;

    if (lastPaymentDate) {
        // Calculate expected due date before last payment
        let expectedDueBeforePayment = new Date(firstRentDate);
        while (expectedDueBeforePayment < lastPaymentDate) {
            if (rentFrequency === 'WEEKLY') {
                expectedDueBeforePayment.setDate(expectedDueBeforePayment.getDate() + 7);
            } else if (rentFrequency === 'MONTHLY') {
                expectedDueBeforePayment.setMonth(expectedDueBeforePayment.getMonth() + 1);
            } else {
                expectedDueBeforePayment.setFullYear(expectedDueBeforePayment.getFullYear() + 1);
            }
        }
        
        // If last payment was after expected due date, check if we're overdue now
        if (lastPaymentDate > expectedDueBeforePayment) {
            // Payment was late, but check current status
            const nextExpectedAfterPayment = new Date(expectedDueBeforePayment);
            if (rentFrequency === 'WEEKLY') {
                nextExpectedAfterPayment.setDate(nextExpectedAfterPayment.getDate() + 7);
            } else if (rentFrequency === 'MONTHLY') {
                nextExpectedAfterPayment.setMonth(nextExpectedAfterPayment.getMonth() + 1);
            } else {
                nextExpectedAfterPayment.setFullYear(nextExpectedAfterPayment.getFullYear() + 1);
            }
            
            if (now > nextExpectedAfterPayment) {
                isOverdue = true;
                daysOverdue = Math.floor((now.getTime() - nextExpectedAfterPayment.getTime()) / (1000 * 60 * 60 * 24));
            }
        }
    } else {
        // No payment yet - check if first rent date has passed
        if (firstRentDate < now) {
            isOverdue = true;
            daysOverdue = Math.floor((now.getTime() - firstRentDate.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    return {
        isOverdue: isOverdue,
        daysUntilDue: isOverdue ? 0 : Math.max(0, diffDays),
        daysOverdue: Math.max(0, daysOverdue),
        minDuePayments: latestTransaction?.status || 0,
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
