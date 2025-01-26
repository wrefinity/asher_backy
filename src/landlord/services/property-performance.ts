import {  TransactionReference, TransactionStatus } from "@prisma/client";
import Queue from 'bull';
import { prismaClient } from "../..";
import RedisService from "../../services/utilsServices/redis.service";

const generateReportQueue = new Queue('generateReportQueue');
class PropertyPerformaceService {
    private static CACHE_TL = 60 * 60
    constructor(private redisService: RedisService) { }
    async rungenerateReport() {
        generateReportQueue.process(async (job) => {
            const propertyId = job.data.propertyId
            const apartmentId = job.data.apartmentId

            try {
                await this.generateReport(propertyId, false)
                await this.generateReport(apartmentId, true)
            } catch (error) {
                console.log(`Error updating property profile ${propertyId}`)
                console.log(`Error updating property profile ${apartmentId}`)
            }
        })

        try {
            const properties = await prismaClient.properties.findMany({ select: { id: true } })
            properties.forEach(property => {
                generateReportQueue.add({ propertyId: property.id }, { repeat: { cron: '0 0 * * *' } })
            })
            const apartments = await prismaClient.apartments.findMany({ select: { id: true } })
            apartments.forEach(apartment => {
                generateReportQueue.add({ apartmentId: apartment.id }, { repeat: { cron: '0 0 * * *' } })
            })
        } catch (error) {
            console.error("Error fetching property", error)
        }
    }
    async generateReport(entityId: string, isApartment: boolean) {
        console.log(`Generating report for property ${entityId} and it's a type of ${isApartment}`);

        const [ocupancyRate, netOperatingIncome, tenantStatisfactionRate, finacialOverview, expenseType, rentRenewalRate] = await Promise.all([
            this.getOccupancyRate(entityId),
            this.getNetOperatingIncome(entityId),
            this.getTenantSatisfactionRate(entityId),
            this.getFinancialOverview(entityId, isApartment),
            this.getExpensesType(entityId, isApartment),
            this.getRentRenewalRate(entityId, isApartment)
        ])

        return {
            ocupancyRate,
            netOperatingIncome,
            tenantStatisfactionRate,
            finacialOverview,
            expenseType,
            rentRenewalRate
        }
    }

    async getOccupancyRate(propertyId: string) {
        const property = await prismaClient.properties.findUnique({
            where: { id: propertyId },
            select: {
                totalApartments: true,
                transactions: {
                    where: {
                        reference: {
                            in: [
                                TransactionReference.BILL_PAYMENT,
                                TransactionReference.RENT_PAYMENT,
                            ]
                        },
                        status: TransactionStatus.COMPLETED,
                    }

                }
            }
        })
        if (!property || property.totalApartments === 0) {
            return 0;
        }

        const occupiedApartments = property.transactions.length;
        const totalApartments = property.totalApartments;

        return (occupiedApartments / totalApartments) * 100;
    }

    getNetOperatingIncome = async (propertyId: string) => {
        //total rent income
        const rentalIncome = await prismaClient.transaction.aggregate({
            where:
            {
                propertyId: propertyId,
                reference: TransactionReference.RENT_PAYMENT,
                status: TransactionStatus.COMPLETED
            },
            _sum: { amount: true }
        })

        // total operating income
        const operatingIncome = await prismaClient.transaction.aggregate({
            where: {
                propertyId: propertyId,
                reference: { in: [TransactionReference.MAINTENANCE_FEE] },
                status: TransactionStatus.COMPLETED
            },
            _sum: { amount: true }
        })

        const rentalIncomeAmount = rentalIncome._sum.amount ? parseFloat(rentalIncome._sum.amount.toString()) : 0;
        const operatingIncomeAmount = operatingIncome._sum.amount ? parseFloat(operatingIncome._sum.amount.toString()) : 0;

        return rentalIncomeAmount - operatingIncomeAmount;
    }

    //tenant satisfaction rate
    async getTenantSatisfactionRate(propertyId: string) {
        const totalRatings = await prismaClient.rating.count({
            where: { propertyId: propertyId }
        })
        const satisfiedTenants = await prismaClient.rating.count({
            where: {
                propertyId: propertyId,
                ratingValue: { gte: 4 }
            }
        })

        if (totalRatings === 0) {
            return 0;
        }

        return (totalRatings / satisfiedTenants) * 100;
    }

    async calculateSubcategoryExpenses(entityId: string, isApartment: boolean) {
        try {
            // Fetch maintenance records based on the entity type
            const maintenances = await prismaClient.maintenance.findMany({
                where: {
                    ...(isApartment ? { apartmentId: entityId } : { propertyId: entityId }),
                    isDeleted: false
                },
                include: {
                    subcategories: true
                }
            });

            // Create a map to aggregate expenses by subcategory
            const expenseMap = new Map<string, number>();

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
        } catch (error) {
            console.error('Error calculating subcategory expenses:', error);
            throw error;
        }
    }

    //financial overview
    async getFinancialOverview(entityId: string, isApartment: boolean) {
        const totalRevenue = await prismaClient.transaction.aggregate({
            where: {
                ...(isApartment ? { appartmentId: entityId } : { propertyId: entityId }),
                reference: { in: [TransactionReference.BILL_PAYMENT, TransactionReference.RENT_PAYMENT] },
                status: TransactionStatus.COMPLETED,
            },
            _sum: { amount: true },
        });

        const totalExpenses = await prismaClient.maintenance.aggregate({
            where: {
                ...(isApartment ? { apartmentId: entityId } : { propertyId: entityId }),
            },
            _sum: { amount: true },
        });

        const totalRev = totalRevenue._sum.amount ? parseFloat(totalRevenue._sum.amount.toString()) : 0;
        const totalExp = totalExpenses._sum.amount ? parseFloat(totalExpenses._sum.amount.toString()) : 0;

        const vatPercentage = 0.2;
        const vatPaid = totalRev * vatPercentage;

        const marketValue = isApartment ? 0 : await prismaClient.properties.findUnique({
            where: { id: entityId },
            select: { marketValue: true }
        }).then(property => property?.marketValue || 0);

        const annualNetIncome = totalRev - totalExp - vatPaid;

        return {
            totalRevenue: totalRev,
            totalExpenses: totalExp,
            vatPaid: vatPaid,
            marketValue: marketValue,
            annualNetIncome: annualNetIncome,
        };
    }

    async getExpensesType(entityId: string, isApartment: boolean) {
        return await this.calculateSubcategoryExpenses(entityId, isApartment);
    }

    async getRentRenewalRate(entityId: string, isApartment: boolean) {
        const totalRentals = await prismaClient.transaction.count({
            where: {
                ...(isApartment ? { appartmentId: entityId } : { propertyId: entityId }),
                reference: TransactionReference.RENT_PAYMENT
            }
        });

        const renewedRentals = await prismaClient.transaction.count({
            where: {
                ...(isApartment ? { appartmentId: entityId } : { propertyId: entityId }),
                reference: TransactionReference.RENT_PAYMENT,
                status: TransactionStatus.RENT_RENEWED,
            }
        });

        if (totalRentals === 0) {
            return 0;
        }

        return (renewedRentals / totalRentals) * 100;
    }


async  getRentVSExpenseMonthlyData(entityId: string, isApartment: boolean, startDate: Date, endDate: Date) {
    try {
        // Fetch monthly rent data with details
        const rentData = await prismaClient.transaction.groupBy({
            by: ['createdAt', 'reference'],
            where: {
                ...(isApartment ? { apartmentId: entityId } : { propertyId: entityId }),
                reference: { in: [TransactionReference.RENT_PAYMENT, TransactionReference.LATE_FEE, TransactionReference.CHARGES] },
                status: TransactionStatus.COMPLETED,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: { amount: true }
        });

        // Fetch monthly expenses data
        const expenseData = await prismaClient.maintenance.groupBy({
            by: ['createdAt', 'categoryId'],
            where: {
                ...(isApartment ? { apartmentId: entityId } : { propertyId: entityId }),
                isDeleted: false,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: { amount: true }
        });

        // Fetch category names separately if needed
        const categories = await prismaClient.category.findMany({
            where: {
                id: { in: expenseData.map(exp => exp.categoryId) }
            }
        });

        // Process rent data
        const rentMap = new Map<string, Map<string, number>>();
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
        const expenseMap = new Map<string, Map<string, number>>();
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
            detailedExpenses: Array.from(categoriesMap.entries()).map(([categoryId, amount]) => ({
                category: categories.find(cat => cat.id === categoryId)?.name || 'Unknown',
                amount
            }))
        }));

        return {
            rentByMonth,
            expensesByMonth
        };
    } catch (error) {
        console.error('Error fetching monthly data:', error);
        throw error;
    }
}


    // async getAnnualizedReturn(propertyId: string) {
    //     const netOperatingIncome = await this.getNetOperatingIncome(propertyId);
    //     const occupancyRate = await this.getOccupancyRate(propertyId);

    //     const annualRent = netOperatingIncome / occupancyRate;

    //     return annualRent * 12;
    // }   

    async cachedReportData(entityId: string, isApartment: boolean) {
        try {
            const cachedData = await this.redisService.get(`property:${entityId}:report`);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            const reportData = await this.generateReport(entityId, isApartment);
            this.redisService.set(`property:${entityId}:report`, JSON.stringify(reportData), PropertyPerformaceService.CACHE_TL);
            return reportData;
        } catch (error) {
            console.log('Error with redis operation', error)
            throw error;
        }
    }


}
const redisService = new RedisService()
const propertyPerformance = new PropertyPerformaceService(redisService);
export default propertyPerformance;