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
const bull_1 = __importDefault(require("bull"));
const __1 = require("../..");
const redis_service_1 = __importDefault(require("../../services/utilsServices/redis.service"));
const generateReportQueue = new bull_1.default('generateReportQueue');
class PropertyPerformaceService {
    constructor(redisService) {
        this.redisService = redisService;
        this.getNetOperatingIncome = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            //total rent income
            const rentalIncome = yield __1.prismaClient.transaction.aggregate({
                where: {
                    propertyId: propertyId,
                    reference: client_1.TransactionReference.RENT_PAYMENT,
                    status: client_1.TransactionStatus.COMPLETED
                },
                _sum: { amount: true }
            });
            // total operating income
            const operatingIncome = yield __1.prismaClient.transaction.aggregate({
                where: {
                    propertyId: propertyId,
                    reference: { in: [client_1.TransactionReference.MAINTENANCE_FEE] },
                    status: client_1.TransactionStatus.COMPLETED
                },
                _sum: { amount: true }
            });
            const rentalIncomeAmount = rentalIncome._sum.amount ? parseFloat(rentalIncome._sum.amount.toString()) : 0;
            const operatingIncomeAmount = operatingIncome._sum.amount ? parseFloat(operatingIncome._sum.amount.toString()) : 0;
            return rentalIncomeAmount - operatingIncomeAmount;
        });
    }
    rungenerateReport() {
        return __awaiter(this, void 0, void 0, function* () {
            generateReportQueue.process((job) => __awaiter(this, void 0, void 0, function* () {
                const propertyId = job.data.propertyId;
                const apartmentId = job.data.apartmentId;
                try {
                    yield this.generateReport(propertyId, false);
                    yield this.generateReport(apartmentId, true);
                }
                catch (error) {
                    console.log(`Error updating property profile ${propertyId}`);
                    console.log(`Error updating property profile ${apartmentId}`);
                }
            }));
            try {
                const properties = yield __1.prismaClient.properties.findMany({ select: { id: true } });
                properties.forEach(property => {
                    generateReportQueue.add({ propertyId: property.id }, { repeat: { cron: '0 0 * * *' } });
                });
                // const apartments = await prismaClient.apartments.findMany({ select: { id: true } })
                // apartments.forEach(apartment => {
                //     generateReportQueue.add({ apartmentId: apartment.id }, { repeat: { cron: '0 0 * * *' } })
                // })
            }
            catch (error) {
                console.error("Error fetching property", error);
            }
        });
    }
    generateReport(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Generating report for property ${entityId} and it's a type of ${isApartment}`);
            const [ocupancyRate, netOperatingIncome, tenantStatisfactionRate, finacialOverview, expenseType, rentRenewalRate] = yield Promise.all([
                this.getOccupancyRate(entityId),
                this.getNetOperatingIncome(entityId),
                this.getTenantSatisfactionRate(entityId),
                this.getFinancialOverview(entityId, isApartment),
                this.getExpensesType(entityId, isApartment),
                this.getRentRenewalRate(entityId, isApartment)
            ]);
            return {
                ocupancyRate,
                netOperatingIncome,
                tenantStatisfactionRate,
                finacialOverview,
                expenseType,
                rentRenewalRate
            };
        });
    }
    getOccupancyRate(propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const property = yield __1.prismaClient.properties.findUnique({
                where: { id: propertyId },
                select: {
                    transactions: {
                        where: {
                            reference: {
                                in: [
                                    client_1.TransactionReference.BILL_PAYMENT,
                                    client_1.TransactionReference.RENT_PAYMENT,
                                ]
                            },
                            status: client_1.TransactionStatus.COMPLETED,
                        }
                    }
                }
            });
            if (!property) {
                return 0;
            }
            const occupiedApartments = property.transactions.length;
            return (occupiedApartments) * 100;
        });
    }
    //tenant satisfaction rate
    getTenantSatisfactionRate(propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalRatings = yield __1.prismaClient.rating.count({
                where: { propertyId: propertyId }
            });
            const satisfiedTenants = yield __1.prismaClient.rating.count({
                where: {
                    propertyId: propertyId,
                    ratingValue: { gte: 4 }
                }
            });
            if (totalRatings === 0) {
                return 0;
            }
            return (totalRatings / satisfiedTenants) * 100;
        });
    }
    calculateSubcategoryExpenses(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch maintenance records based on the entity type
                const maintenances = yield __1.prismaClient.maintenance.findMany({
                    where: Object.assign(Object.assign({}, (isApartment ? { apartmentId: entityId } : { propertyId: entityId })), { isDeleted: false }),
                    include: {
                        subcategories: true
                    }
                });
                // Create a map to aggregate expenses by subcategory
                const expenseMap = new Map();
                for (const maintenance of maintenances) {
                    for (const subcategory of maintenance.subcategories) {
                        const key = subcategory.name; // Adjust if the key should be something else
                        const currentAmount = expenseMap.get(key) || 0;
                        expenseMap.set(key, currentAmount + parseFloat(maintenance.amount.toString()));
                    }
                }
                // Calculate total expenses amount
                const totalExpensesAmount = Array.from(expenseMap.values()).reduce((acc, amount) => acc + amount, 0);
                if (totalExpensesAmount === 0) {
                    return [];
                }
                // Map expenses to the desired format
                return Array.from(expenseMap.entries()).map(([category, amount]) => ({
                    category,
                    amount,
                    percentage: (amount / totalExpensesAmount) * 100
                }));
            }
            catch (error) {
                console.error('Error calculating subcategory expenses:', error);
                throw error;
            }
        });
    }
    //financial overview
    getFinancialOverview(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalRevenue = yield __1.prismaClient.transaction.aggregate({
                where: Object.assign(Object.assign({}, (isApartment ? { appartmentId: entityId } : { propertyId: entityId })), { reference: { in: [client_1.TransactionReference.BILL_PAYMENT, client_1.TransactionReference.RENT_PAYMENT] }, status: client_1.TransactionStatus.COMPLETED }),
                _sum: { amount: true },
            });
            const totalExpenses = yield __1.prismaClient.maintenance.aggregate({
                where: Object.assign({}, (isApartment ? { propertyId: entityId } : { propertyId: entityId })),
                _sum: { amount: true },
            });
            const totalRev = totalRevenue._sum.amount ? parseFloat(totalRevenue._sum.amount.toString()) : 0;
            const totalExp = totalExpenses._sum.amount ? parseFloat(totalExpenses._sum.amount.toString()) : 0;
            const vatPercentage = 0.2;
            const vatPaid = totalRev * vatPercentage;
            const marketValue = isApartment ? 0 : yield __1.prismaClient.properties.findUnique({
                where: { id: entityId },
                select: { marketValue: true }
            }).then(property => (property === null || property === void 0 ? void 0 : property.marketValue) || 0);
            const annualNetIncome = totalRev - totalExp - vatPaid;
            return {
                totalRevenue: totalRev,
                totalExpenses: totalExp,
                vatPaid: vatPaid,
                marketValue: marketValue,
                annualNetIncome: annualNetIncome,
            };
        });
    }
    getExpensesType(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.calculateSubcategoryExpenses(entityId, isApartment);
        });
    }
    getRentRenewalRate(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalRentals = yield __1.prismaClient.transaction.count({
                where: Object.assign(Object.assign({}, (isApartment ? { appartmentId: entityId } : { propertyId: entityId })), { reference: client_1.TransactionReference.RENT_PAYMENT })
            });
            const renewedRentals = yield __1.prismaClient.transaction.count({
                where: Object.assign(Object.assign({}, (isApartment ? { appartmentId: entityId } : { propertyId: entityId })), { reference: client_1.TransactionReference.RENT_PAYMENT, status: client_1.TransactionStatus.RENT_RENEWED })
            });
            if (totalRentals === 0) {
                return 0;
            }
            return (renewedRentals / totalRentals) * 100;
        });
    }
    getRentVSExpenseMonthlyData(entityId, isApartment, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch monthly rent data with details
                const rentData = yield __1.prismaClient.transaction.groupBy({
                    by: ['createdAt', 'reference'],
                    where: Object.assign(Object.assign({}, (isApartment ? { apartmentId: entityId } : { propertyId: entityId })), { reference: { in: [client_1.TransactionReference.RENT_PAYMENT, client_1.TransactionReference.LATE_FEE, client_1.TransactionReference.CHARGES] }, status: client_1.TransactionStatus.COMPLETED, createdAt: {
                            gte: startDate,
                            lte: endDate
                        } }),
                    _sum: { amount: true }
                });
                // Fetch monthly expenses data
                const expenseData = yield __1.prismaClient.maintenance.groupBy({
                    by: ['createdAt', 'categoryId'],
                    where: Object.assign(Object.assign({}, (isApartment ? { apartmentId: entityId } : { propertyId: entityId })), { isDeleted: false, createdAt: {
                            gte: startDate,
                            lte: endDate
                        } }),
                    _sum: { amount: true }
                });
                // Fetch category names separately if needed
                const categories = yield __1.prismaClient.category.findMany({
                    where: {
                        id: { in: expenseData.map(exp => exp.categoryId) }
                    }
                });
                // Process rent data
                const rentMap = new Map();
                for (const data of rentData) {
                    const month = new Date(data.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                    const reference = data.reference;
                    const amount = data._sum.amount || 0;
                    if (!rentMap.has(month)) {
                        rentMap.set(month, new Map());
                    }
                    const monthMap = rentMap.get(month);
                    monthMap.set(reference, (monthMap.get(reference) || 0) + parseFloat(amount.toString()));
                }
                const rentByMonth = Array.from(rentMap.entries()).map(([month, typesMap]) => ({
                    month,
                    totalRent: Array.from(typesMap.values()).reduce((sum, amount) => sum + amount, 0),
                    detailedRent: Array.from(typesMap.entries()).map(([type, amount]) => ({
                        type,
                        amount
                    }))
                }));
                // Process expense data
                const expenseMap = new Map();
                for (const data of expenseData) {
                    const month = new Date(data.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                    const categoryId = data.categoryId;
                    const amount = data._sum.amount || 0;
                    if (!expenseMap.has(month)) {
                        expenseMap.set(month, new Map());
                    }
                    const monthMap = expenseMap.get(month);
                    monthMap.set(categoryId, (monthMap.get(categoryId) || 0) + parseFloat(amount.toString()));
                }
                const expensesByMonth = Array.from(expenseMap.entries()).map(([month, categoriesMap]) => ({
                    month,
                    totalExpenses: Array.from(categoriesMap.values()).reduce((sum, amount) => sum + amount, 0),
                    detailedExpenses: Array.from(categoriesMap.entries()).map(([categoryId, amount]) => {
                        var _a;
                        return ({
                            category: ((_a = categories.find(cat => cat.id === categoryId)) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                            amount
                        });
                    })
                }));
                return {
                    rentByMonth,
                    expensesByMonth
                };
            }
            catch (error) {
                console.error('Error fetching monthly data:', error);
                throw error;
            }
        });
    }
    // async getAnnualizedReturn(propertyId: string) {
    //     const netOperatingIncome = await this.getNetOperatingIncome(propertyId);
    //     const occupancyRate = await this.getOccupancyRate(propertyId);
    //     const annualRent = netOperatingIncome / occupancyRate;
    //     return annualRent * 12;
    // }   
    cachedReportData(entityId, isApartment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cachedData = yield this.redisService.get(`property:${entityId}:report`);
                if (cachedData) {
                    return JSON.parse(cachedData);
                }
                const reportData = yield this.generateReport(entityId, isApartment);
                this.redisService.set(`property:${entityId}:report`, JSON.stringify(reportData), PropertyPerformaceService.CACHE_TL);
                return reportData;
            }
            catch (error) {
                console.log('Error with redis operation', error);
                throw error;
            }
        });
    }
}
PropertyPerformaceService.CACHE_TL = 60 * 60;
const redisService = new redis_service_1.default();
const propertyPerformance = new PropertyPerformaceService(redisService);
exports.default = propertyPerformance;
