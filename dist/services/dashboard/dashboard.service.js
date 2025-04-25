"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const __1 = require("../..");
const bull_1 = __importDefault(require("bull"));
const redis_service_1 = __importDefault(require("../utilsServices/redis.service"));
const dashboardUpdateQueue = new bull_1.default('dashboardUpdates');
class DashboardService {
    constructor(redisService) {
        this.redisService = redisService;
    }
    initializeBagroundJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            dashboardUpdateQueue.process((job) => __awaiter(this, void 0, void 0, function* () {
                const userId = job.data.userId;
                console.log(`Started dashboard refetch update job ${userId}`);
                try {
                    yield this.dashboardDetails(userId);
                }
                catch (error) {
                    console.error(`Error updating dashboard for user ${userId}:`, error);
                }
            }));
            try {
                const users = yield __1.prismaClient.users.findMany({ select: { id: true } });
                users.forEach((user) => {
                    dashboardUpdateQueue.add({ userId: user.id }, { repeat: { cron: '0 0 * * *' } });
                });
            }
            catch (error) {
                console.error("Error updating", error);
            }
        });
    }
    dashboardDetails(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [userCreditScore, propertyPaymentDetails, transactionDetails, tenant] = yield Promise.all([
                    __1.prismaClient.creditScore.findUnique({
                        where: { userId },
                        select: {
                            score: true,
                        },
                    }),
                    __1.prismaClient.transaction.findMany({
                        where: { userId: userId },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }),
                    __1.prismaClient.transaction.findMany({
                        where: { userId },
                        include: {},
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }),
                    __1.prismaClient.tenants.findUnique({
                        where: { userId: userId },
                    }),
                ]);
                // NOTE: THIS IS NOT VALID
                const rentStatus = yield this.calculateRentStatus(tenant.rentstatus[0]);
                console.log(`Rent status ${rentStatus}`);
                const [totalDueBills, totalDuePayments] = yield Promise.all([
                    this.calculateTotalDueBills(userId),
                    this.calculateTotalDuePayments(userId),
                ]);
                return {
                    userCreditScore: userCreditScore === null || userCreditScore === void 0 ? void 0 : userCreditScore.score,
                    propertyPaymentDetails,
                    transactionDetails,
                    rentStatus,
                    totalDueBills,
                    totalDuePayments,
                };
            }
            catch (error) {
                console.error("Error fetching dashboard details: ", error);
                throw new Error("Failed fetching details" + error);
            }
        });
    }
    calculateRentStatus(latestTransaction) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!latestTransaction) {
                return {
                    isOverdue: false,
                    daysUntilDue: 0,
                    daysOverDue: 0,
                    minDuePayments: 0,
                };
            }
            const now = new Date();
            // const dueDate = new Date(latestTransaction.property.nextDueDate)
            const dueDate = new Date();
            const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            return {
                isOverdue: diffDays < 0,
                daysUntilDue: Math.max(0, diffDays),
                daysOverdue: Math.max(0, -diffDays),
                minDuePayments: latestTransaction.status,
            };
        });
    }
    calculateTotalDueBills(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dueBills = yield __1.prismaClient.transaction.aggregate({
                where: {
                    userId: userId,
                    reference: client_1.TransactionReference.MAINTENANCE_FEE,
                    status: client_1.TransactionStatus.PENDING,
                    // nextDueDate: { lte: new Date() },
                },
                _sum: { amount: true },
            });
            return dueBills._sum.amount || new library_1.Decimal(0);
        });
    }
    calculateTotalDuePayments(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const duePayments = yield __1.prismaClient.transaction.aggregate({
                where: {
                    userId: userId,
                    reference: client_1.TransactionReference.RENT_DUE,
                    status: client_1.TransactionStatus.PENDING,
                    // dueDate: { lte: new Date() },
                },
                _sum: { amount: true },
            });
            return duePayments._sum.amount || new library_1.Decimal(0);
        });
    }
    returnDuePayments(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [nativeTransactionDue, propertyTransactionDue] = yield Promise.all([
                __1.prismaClient.transaction.findMany({
                    where: {
                        userId,
                        status: client_1.TransactionStatus.PENDING,
                    },
                    include: {},
                }),
                // property Transaction
                __1.prismaClient.transaction.findMany({
                    where: {
                        userId,
                        status: client_1.TransactionStatus.PENDING,
                        // nextDueDate: { lte: new Date() },
                    },
                })
            ]);
            return {
                nativeTransactionDue,
                propertyTransactionDue,
            };
        });
    }
    getDashboardData(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cachedData = yield this.redisService.get(`dashboard:${userId}`);
                if (cachedData) {
                    console.log(`Cache hit for user ${userId}`);
                    return JSON.parse(cachedData);
                }
                console.log(`Cache miss for user ${userId}`);
                const dashboardData = yield this.dashboardDetails(userId);
                yield this.redisService.set(`dashboard:${userId}`, JSON.stringify(dashboardData), DashboardService.CACHE_TTL);
                return dashboardData;
            }
            catch (error) {
                console.error('Error with Redis operation:', error);
                throw error;
            }
        });
    }
}
DashboardService.CACHE_TTL = 60 * 60;
const redisService = new redis_service_1.default();
const dashboardService = new DashboardService(redisService);
exports.default = dashboardService;
