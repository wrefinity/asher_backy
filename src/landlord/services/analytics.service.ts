import {
    ApplicationStatus,
    Prisma,
    TransactionReference,
    TransactionType,
    TransactionStatus,
} from '@prisma/client';
import { prismaClient } from '../..';
import { PLATFORM_DEFAULT_CURRENCY } from '../../secrets';
import { getCurrencyForCountry, normalizeCurrencyCode } from '../../utils/helpers';
import { countTenantsByLeaseBucket } from '../../utils/categorizeTenantLeaseStatus';

class AnalyticsService {
    // Dashboard Analytics

    getFinancialAnalyticLandlord = async (userId: string) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Batch queries in smaller groups to prevent connection pool exhaustion
        // Batch 1: Income queries (2 parallel queries)
        const [currentIncome, previousIncome] = await Promise.all([
            // Current month income
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.CREDIT,
                    status: TransactionStatus.COMPLETED,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                    reference: { in: ["RENT_PAYMENT", "RECEIVE_PAYMENT", "FUND_WALLET"] }
                },
                _sum: { amount: true }
            }),

            // Previous month income
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.CREDIT,
                    status: TransactionStatus.COMPLETED,
                    createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth }
                },
                _sum: { amount: true }
            })
        ]);

        // Batch 2: Expense queries (2 parallel queries)
        const [currentExpenses, previousExpenses] = await Promise.all([
            // Current month expenses
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.DEBIT,
                    status: TransactionStatus.COMPLETED,
                    createdAt: { gte: startOfMonth, lte: endOfMonth }
                },
                _sum: { amount: true }
            }),

            // Previous month expenses
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.DEBIT,
                    status: TransactionStatus.COMPLETED,
                    createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth }
                },
                _sum: { amount: true }
            })
        ]);

        // Batch 3: Overdue queries (2 parallel queries)
        const [currentOverdue, previousOverdue] = await Promise.all([
            // Current overdue (this month)
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    reference: TransactionReference.RENT_DUE,
                    status: TransactionStatus.PENDING,
                    isDue: true,
                    createdAt: { gte: startOfMonth, lte: endOfMonth }
                },
                _sum: { amount: true }
            }),

            // Previous month overdue
            prismaClient.transaction.aggregate({
                where: {
                    userId,
                    reference: TransactionReference.RENT_DUE,
                    status: TransactionStatus.PENDING,
                    isDue: true,
                    createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth }
                },
                _sum: { amount: true }
            })
        ]);

        // Convert Decimal → number
        const income = currentIncome._sum.amount?.toNumber() ?? 0;
        const previousIncomeAmount = previousIncome._sum.amount?.toNumber() ?? 0;
        const expenses = currentExpenses._sum.amount?.toNumber() ?? 0;
        const previousExpensesAmount = previousExpenses._sum.amount?.toNumber() ?? 0;

        const overdueAmount = currentOverdue._sum.amount?.toNumber() ?? 0;
        const previousOverdueAmount = previousOverdue._sum.amount?.toNumber() ?? 0;

        return {
            totalIncome: {
                amount: income,
                changePercent:
                    previousIncomeAmount === 0
                        ? 100
                        : ((income - previousIncomeAmount) / previousIncomeAmount) * 100,
                lastMonth: previousIncomeAmount
            },
            totalExpenses: {
                amount: expenses,
                changePercent:
                    previousExpensesAmount === 0
                        ? 100
                        : ((expenses - previousExpensesAmount) / previousExpensesAmount) * 100,
                lastMonth: previousExpensesAmount
            },

            // Overdue section fully dynamic
            overduePayment: {
                amount: overdueAmount,
                changePercent:
                    previousOverdueAmount === 0
                        ? 100
                        : ((overdueAmount - previousOverdueAmount) / previousOverdueAmount) * 100,
                lastMonth: previousOverdueAmount
            },

            netProfit: {
                amount: income - expenses,
                changePercent:
                    previousIncomeAmount - previousExpensesAmount === 0
                        ? 100
                        : (
                            ((income - expenses) -
                                (previousIncomeAmount - previousExpensesAmount)) /
                            (previousIncomeAmount - previousExpensesAmount)
                        ) * 100,
                lastMonth: previousIncomeAmount - previousExpensesAmount
            }
        };
    };
    async getDashboardAnalytics(landlordId: string) {
        const [
            portfolio,
            tenantBreakdown,
            totalRevenue,
            maintenanceRequests,
            rentCollectionRate,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            totalApplications,
            totalFiles,
            storageUsed,
            totalPortfolioValue,
            unitOccupancy,
            revenueGrowth,
        ] = await Promise.all([
            this.getPortfolioSummary(landlordId),
            this.getTenantBreakdown(landlordId),
            this.getTotalRevenue(landlordId),
            this.getMaintenanceRequestsCount(landlordId),
            this.getRentCollectionRate(landlordId),
            this.getPendingApplications(landlordId),
            this.getApprovedApplications(landlordId),
            this.getRejectedApplications(landlordId),
            this.getTotalApplications(landlordId),
            this.getTotalFiles(landlordId),
            this.getStorageUsed(landlordId),
            this.getTotalPortfolioValue(landlordId),
            this.getUnitPortfolioBreakdown(landlordId),
            this.calculateRevenueGrowth(landlordId),
        ]);

        const storageAvailable = Math.max(0, 100 - storageUsed);
        const totalProperties = portfolio.totalProperties;
        const averagePropertyValue =
            totalProperties > 0 ? totalPortfolioValue / totalProperties : 0;
        const annualizedRevenue = totalRevenue * 12;
        const roi =
            totalPortfolioValue > 0
                ? Math.round((annualizedRevenue / totalPortfolioValue) * 1000) / 10
                : 0;
        const portfolioGrowth = revenueGrowth;
        const totalEquity = totalPortfolioValue;
        const equityGrowth = revenueGrowth;

        return {
            portfolio,
            tenantBreakdown,
            totalProperties,
            totalTenants: tenantBreakdown.current,
            totalRevenue,
            occupancyRate: portfolio.occupancyRate,
            maintenanceRequests,
            rentCollectionRate,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            totalApplications,
            totalFiles,
            storageUsed,
            storageAvailable,
            totalPortfolioValue,
            portfolioGrowth,
            totalEquity,
            equityGrowth,
            averagePropertyValue,
            roi,
            activeListings: portfolio.activeListings,
            inactiveListings: portfolio.inactiveListings,
            revenueGrowth,
            occupiedProperties: portfolio.occupiedProperties,
            vacantProperties: portfolio.vacantProperties,
            unspecifiedProperties: portfolio.unspecifiedProperties,
            residentialCount: portfolio.residentialCount,
            commercialCount: portfolio.commercialCount,
            shortletCount: portfolio.shortletCount,
            shortletOccupied: portfolio.shortletOccupied,
            shortletVacant: portfolio.shortletVacant,
            unitOccupancy,
            userName: 'User',
        };
    }

    /** Single DB read for property + listing counts shown on the dashboard. */
    async getPortfolioSummary(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId, isDeleted: false },
            select: {
                availability: true,
                specificationType: true,
                isListed: true,
                currency: true,
            },
        });

        let occupiedProperties = 0;
        let vacantProperties = 0;
        let unspecifiedProperties = 0;
        let shortletCount = 0;
        let shortletOccupied = 0;
        let shortletVacant = 0;
        let residentialCount = 0;
        let commercialCount = 0;
        let activeListings = 0;
        let inactiveListings = 0;

        for (const property of properties) {
            if (property.isListed === true) activeListings += 1;
            else inactiveListings += 1;

            const spec = String(property.specificationType ?? '').toUpperCase();
            const availability = String(property.availability ?? '')
                .trim()
                .toUpperCase();

            if (spec === 'SHORTLET') {
                shortletCount += 1;
                if (availability === 'OCCUPIED') shortletOccupied += 1;
                else if (availability === 'VACANT') shortletVacant += 1;
            } else if (spec === 'COMMERCIAL') {
                commercialCount += 1;
            } else {
                residentialCount += 1;
            }

            if (availability === 'OCCUPIED') occupiedProperties += 1;
            else if (availability === 'VACANT') vacantProperties += 1;
            else unspecifiedProperties += 1;
        }

        const totalProperties = properties.length;
        const occupancyRate =
            totalProperties > 0
                ? Math.round((occupiedProperties / totalProperties) * 1000) / 10
                : 0;

        const portfolioCurrency =
            properties.find(p => p.currency)?.currency?.toString() ||
            PLATFORM_DEFAULT_CURRENCY;

        return {
            totalProperties,
            occupiedProperties,
            vacantProperties,
            unspecifiedProperties,
            residentialCount,
            commercialCount,
            shortletCount,
            shortletOccupied,
            shortletVacant,
            activeListings,
            inactiveListings,
            occupancyRate,
            currency: portfolioCurrency,
        };
    }

    /** Current / future / past tenants — same rules as property tenants tab. */
    async getTenantBreakdown(landlordId: string) {
        const tenants = await prismaClient.tenants.findMany({
            where: { landlordId },
            select: {
                isCurrentLease: true,
                leaseStartDate: true,
                leaseEndDate: true,
            },
        });

        const breakdown = countTenantsByLeaseBucket(tenants);

        return {
            current: breakdown.current,
            future: breakdown.future,
            past: breakdown.past,
            total: breakdown.total,
            currentPercent: breakdown.currentPercent,
            futurePercent: breakdown.futurePercent,
            pastPercent: breakdown.pastPercent,
        };
    }

    /** Monthly income / expenses series for dashboard cash-flow chart. */
    async getCashFlowData(landlordId: string, period: string = '12months') {
        return this.getCashFlowSeries(landlordId, period);
    }

    async getCashFlowSeries(landlordId: string, period: string = '12months') {
        const startDate = this.getPeriodStartDate(period);
        const monthCount = this.getMonthsForPeriod(period);
        const now = new Date();

        const transactions = await prismaClient.transaction.findMany({
            where: {
                property: { landlordId },
                status: TransactionStatus.COMPLETED,
                createdAt: { gte: startDate },
            },
            select: { type: true, amount: true, createdAt: true },
        });

        const rows: Array<{
            period: string;
            income: number;
            expenses: number;
            netFlow: number;
            date: string;
        }> = [];

        for (let i = monthCount - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(
                now.getFullYear(),
                now.getMonth() - i + 1,
                0,
                23,
                59,
                59,
                999
            );

            const inMonth = transactions.filter(t => {
                const d = new Date(t.createdAt);
                return d >= monthStart && d <= monthEnd;
            });

            const income = inMonth
                .filter(t => t.type === TransactionType.CREDIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const expenses = inMonth
                .filter(t => t.type === TransactionType.DEBIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            rows.push({
                period: monthStart.toLocaleString('en-US', {
                    month: 'short',
                    year: '2-digit',
                }),
                income,
                expenses,
                netFlow: income - expenses,
                date: monthStart.toISOString(),
            });
        }

        return rows;
    }

    /** Normalize landlord financial cash-flow months for dashboard widgets. */
    mapCashFlowToChartSeries(
        monthlyData: Array<{
            month?: string;
            income?: number;
            expenses?: number;
            net?: number;
        }> = []
    ) {
        const now = new Date();
        return monthlyData.map((row, index) => {
            const monthDate = new Date(now.getFullYear(), index, 1);
            return {
                period: row.month ?? monthDate.toLocaleString('en-US', { month: 'short' }),
                income: Number(row.income) || 0,
                expenses: Number(row.expenses) || 0,
                netFlow: Number(row.net) || 0,
                date: monthDate.toISOString(),
            };
        });
    }

    async getPropertyPerformance(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                tenants: {
                    where: { isCurrentLease: true }
                },
                transactions: {
                    where: { type: 'CREDIT', reference: 'RENT_PAYMENT' }
                },
                maintenance: true,
                ratings: true
            }
        });

        return properties.map(property => ({
            propertyId: property.id,
            propertyName: property.name,
            occupancyRate: property.tenants.length > 0 ? 100 : 0,
            monthlyRevenue: this.calculateMonthlyRevenue(property.transactions),
            maintenanceCount: property.maintenance.length,
            tenantSatisfaction: this.calculateAverageRating(property.ratings),
            monthlyRent: Number(property.price) || 0
        }));
    }

    async getMaintenanceAnalytics(landlordId: string) {
        const maintenance = await prismaClient.maintenance.findMany({
            where: {
                landlordId
            },
            include: {
                property: true,
                category: true
            }
        });

        const statusCounts = this.groupByStatus(maintenance);
        const categoryCounts = this.groupByCategory(maintenance);
        const priorityCounts = this.groupByPriority(maintenance);
        const averageResolutionTime = this.calculateAverageResolutionTime(maintenance);

        return {
            totalRequests: maintenance.length,
            statusCounts,
            categoryCounts,
            priorityCounts,
            averageResolutionTime,
            trends: this.calculateMaintenanceTrends(maintenance),
        };
    }

    // Financial Analytics
    async getIncomeStatistics(landlordId: string, period: string) {
        const startDate = this.getPeriodStartDate(period);

        const incomeBySource = await prismaClient.transaction.groupBy({
            by: ['reference'],
            where: {
                property: { landlordId },
                type: 'CREDIT',
                createdAt: { gte: startDate }
            },
            _sum: { amount: true },
            _count: true
        });

        const monthlyIncome = await this.getMonthlyIncome(landlordId, startDate);

        return {
            totalIncome: incomeBySource.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0),
            incomeBySource: incomeBySource.map(item => ({
                source: item.reference,
                amount: Number(item._sum.amount) || 0,
                count: item._count
            })),
            monthlyIncome,
            growthRate: this.calculateGrowthRate(monthlyIncome)
        };
    }

    async getExpenseBreakdown(landlordId: string, period: string) {
        const startDate = this.getPeriodStartDate(period);

        const expensesByCategory = await prismaClient.transaction.groupBy({
            by: ['reference'],
            where: {
                property: { landlordId },
                type: 'DEBIT',
                createdAt: { gte: startDate }
            },
            _sum: { amount: true },
            _count: true
        });

        const totalExpenses = expensesByCategory.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0);

        return {
            totalExpenses,
            expensesByCategory: expensesByCategory.map(item => ({
                category: item.reference,
                amount: Number(item._sum.amount) || 0,
                count: item._count,
                percentage: totalExpenses > 0 ? (Number(item._sum.amount || 0) / totalExpenses) * 100 : 0
            }))
        };
    }

    async getFinancialSummary(landlordId: string, period: string) {
        const startDate = this.getPeriodStartDate(period);

        // Execute sequentially to prevent connection pool exhaustion
        const income = await this.getIncomeStatistics(landlordId, period);
        const expenses = await this.getExpenseBreakdown(landlordId, period);

        const netIncome = income.totalIncome - expenses.totalExpenses;
        const profitMargin = income.totalIncome > 0 ? (netIncome / income.totalIncome) * 100 : 0;

        return {
            totalRevenue: income.totalIncome,
            totalExpenses: expenses.totalExpenses,
            netProfit: netIncome,
            cashFlow: netIncome,
            profitMargin,
            period,
            trends: {
                incomeGrowth: income.growthRate,
                expenseGrowth: 0 // Calculate expense growth
            }
        };
    }

    // Performance Analytics
    async getTenantPerformanceAnalytics(landlordId: string, tenantId?: string) {
        const whereClause: any = {
            landlordId
        };

        if (tenantId) {
            whereClause.id = tenantId;
        }

        const tenants = await prismaClient.tenants.findMany({
            where: whereClause,
            include: {
                user: true,
                property: true,
                reviews: true,
                violation: true,
                maintenances: true
            }
        });

        return tenants.map(tenant => ({
            tenantId: tenant.id,
            tenantName: tenant.user?.email || 'Unknown',
            propertyName: tenant.property?.name || 'Unknown',
            paymentHistory: this.calculatePaymentHistory(tenant),
            averageRating: this.calculateAverageRating(tenant.reviews),
            violationsCount: tenant.violation.length,
            maintenanceRequestsCount: tenant.maintenances.length,
            performanceScore: this.calculatePerformanceScore(tenant),
            leaseStart: tenant.leaseStartDate,
            leaseEnd: tenant.leaseEndDate,
            isCurrentLease: tenant.isCurrentLease
        }));
    }

    async getRentalPerformanceAnalytics(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId, isDeleted: false },
            select: {
                id: true,
                price: true,
                availability: true,
                isListed: true,
            },
        });

        const propertyIds = properties.map(p => p.id);
        const startDate = this.getPeriodStartDate('12months');

        const [totalViews, totalInquiries] = await Promise.all([
            propertyIds.length > 0
                ? prismaClient.log.count({
                      where: {
                          propertyId: { in: propertyIds },
                          type: 'VIEW',
                          createdAt: { gte: startDate },
                      },
                  })
                : Promise.resolve(0),
            propertyIds.length > 0
                ? prismaClient.log.count({
                      where: {
                          propertyId: { in: propertyIds },
                          type: 'ENQUIRED',
                          createdAt: { gte: startDate },
                      },
                  })
                : Promise.resolve(0),
        ]);

        let listedProperties = 0;
        let unlistedProperties = 0;
        let occupiedProperties = 0;
        let vacantProperties = 0;
        let unspecifiedProperties = 0;

        for (const property of properties) {
            if (property.isListed === true) listedProperties += 1;
            else unlistedProperties += 1;

            const availability = String(property.availability ?? '')
                .trim()
                .toUpperCase();
            if (availability === 'OCCUPIED') occupiedProperties += 1;
            else if (availability === 'VACANT') vacantProperties += 1;
            else unspecifiedProperties += 1;
        }

        const totalProperties = properties.length;
        const conversionRate =
            totalViews > 0
                ? Math.round((totalInquiries / totalViews) * 1000) / 10
                : 0;
        const occupancyRate =
            totalProperties > 0
                ? Math.round((occupiedProperties / totalProperties) * 1000) / 10
                : 0;

        return {
            totalProperties,
            listedProperties,
            unlistedProperties,
            /** @deprecated Use listedProperties — was incorrectly active + unlisted (all properties) */
            totalListings: listedProperties,
            activeListings: listedProperties,
            inactiveListings: unlistedProperties,
            occupiedProperties,
            vacantProperties,
            unspecifiedProperties,
            totalViews,
            totalInquiries,
            conversionRate,
            occupancyRate,
        };
    }

    async getPropertyAnalytics(
        landlordId: string,
        propertyId: string,
        period: string = '12months'
    ) {
        const startDate = this.getPeriodStartDate(period);

        const property = await prismaClient.properties.findFirst({
            where: { id: propertyId, landlordId },
            include: {
                tenants: { where: { isCurrentLease: true } },
                specification: {
                    where: { isActive: true },
                    include: {
                        residential: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                    },
                                },
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                    },
                                },
                            },
                        },
                        commercial: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                    },
                                },
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                    },
                                },
                            },
                        },
                        shortlet: {
                            include: {
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                transactions: {
                    where: {
                        createdAt: { gte: startDate },
                        status: TransactionStatus.COMPLETED,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                maintenance: {
                    where: {
                        isDeleted: false,
                        createdAt: { gte: startDate },
                    },
                    include: {
                        category: true,
                        vendor: {
                            include: {
                                user: { select: { email: true, profile: { select: { fullname: true } } } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                ratings: true,
                reviews: true,
            },
        });

        if (!property) {
            throw new Error('Property not found');
        }

        const overdueAgg = await prismaClient.transaction.aggregate({
            where: {
                propertyId,
                reference: TransactionReference.RENT_DUE,
                status: TransactionStatus.PENDING,
                isDue: true,
            },
            _sum: { amount: true },
        });

        const credits = property.transactions.filter(t => t.type === TransactionType.CREDIT);
        const debits = property.transactions.filter(t => t.type === TransactionType.DEBIT);

        const incomeBreakdown = this.buildPropertyIncomeBreakdown(credits);
        const expenseBreakdown = this.buildPropertyExpenseBreakdown(debits);
        const monthCount = this.getMonthsForPeriod(period);
        const monthlySeries = this.buildPropertyMonthlySeries(
            property.transactions,
            monthCount
        );
        const rentTrend = this.buildPropertyRentTrend(property.transactions, monthCount);
        const rentTrendSummary = this.buildRentTrendSummary(rentTrend);
        const monthlyListedRent = this.calculateListedMonthlyRent(property);
        const periodLabel = this.formatPeriodLabel(period);

        const marketValue = Number(property.marketValue ?? 0);
        const propertyValue = Number(property.propertyValue ?? property.marketValue ?? 0);
        const periodRevenue = credits.reduce((sum, t) => sum + Number(t.amount), 0);
        const periodExpenses = debits.reduce((sum, t) => sum + Number(t.amount), 0);
        const maintenanceOpen = property.maintenance.filter(
            m => m.status !== 'COMPLETED' && m.status !== 'CANCEL'
        ).length;

        const occupancy = this.calculatePropertyOccupancy(property);
        const propertyEvents = await this.buildPropertyEventTimeline(propertyId, property);

        const sourceCurrency = this.resolvePropertySourceCurrency(property);

        return {
            propertyId: property.id,
            propertyName: property.name,
            currency: sourceCurrency,
            country: property.country,
            priceFrequency: property.priceFrequency,
            rentalPeriod: property.rentalPeriod,
            specificationType: property.specificationType,
            createdAt: property.createdAt,
            period,
            periodLabel,
            marketValue,
            propertyValue,
            propertyFormData: {
                marketValue,
                propertyValue,
                yearBuilt: property.yearBuilt,
            },
            occupancyStatus: occupancy.occupiedUnits > 0 ? 'OCCUPIED' : 'VACANT',
            occupancyRate: occupancy.occupancyRate,
            occupancyDetail: occupancy,
            monthlyRevenue: this.calculateMonthlyRevenue(credits),
            totalExpenses: this.calculateMonthlyExpenses(debits),
            periodRevenue,
            periodExpenses,
            periodNetIncome: periodRevenue - periodExpenses,
            outstandingRent: Number(overdueAgg._sum.amount ?? 0),
            incomeBreakdown,
            expenseBreakdown,
            maintenanceExpenses: this.buildMaintenanceExpenseRows(property.maintenance),
            rentHistory: this.buildRentHistoryRows(credits),
            propertyEvents,
            monthlySeries,
            rentTrend,
            rentTrendSummary,
            rentValue: {
                monthlyListedRent,
                annualRentValue: monthlyListedRent * 12,
                periodRentCollected: incomeBreakdown.rent,
                monthlyRentCollected: this.calculateMonthlyRentCollected(credits),
            },
            maintenanceRequests: property.maintenance.length,
            maintenanceSummary: {
                total: property.maintenance.length,
                open: maintenanceOpen,
                completed: property.maintenance.filter(m => m.status === 'COMPLETED').length,
                averageResolutionDays: this.calculateAverageResolutionTime(property.maintenance),
            },
            averageRating: this.calculateAverageRating(property.ratings),
            tenantSatisfaction: this.calculateAverageRating(property.reviews),
            profitMargin: this.calculatePropertyProfitMargin(property.transactions),
            monthlyRent: Number(property.price) || 0,
            currentTenants: property.tenants.length,
        };
    }

    private async buildPropertyEventTimeline(
        propertyId: string,
        property: { name?: string | null; createdAt: Date }
    ) {
        type TimelineEvent = {
            id: string;
            date: string;
            createdAt: Date;
            category: string;
            event: string;
            amount?: number;
            status?: string;
        };

        const events: TimelineEvent[] = [
            {
                id: `property-created-${propertyId}`,
                date: property.createdAt.toISOString().split('T')[0],
                createdAt: property.createdAt,
                category: 'Property',
                event: property.name
                    ? `Property created — ${property.name}`
                    : 'Property created',
            },
        ];

        const [
            logs,
            transactions,
            maintenanceRows,
            applications,
            tenantRows,
            inspectionRows,
            listingRows,
        ] = await Promise.all([
            prismaClient.log.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                take: 150,
                include: {
                    users: {
                        select: {
                            email: true,
                            profile: { select: { fullname: true, firstName: true, lastName: true } },
                        },
                    },
                },
            }),
            prismaClient.transaction.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                take: 150,
            }),
            prismaClient.maintenance.findMany({
                where: { propertyId, isDeleted: false },
                orderBy: { createdAt: 'desc' },
                take: 80,
                include: { category: true },
            }),
            prismaClient.application.findMany({
                where: { propertiesId: propertyId, isDeleted: false },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prismaClient.tenants.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: {
                    user: {
                        select: {
                            email: true,
                            profile: {
                                select: { fullname: true, firstName: true, lastName: true },
                            },
                        },
                    },
                },
            }),
            prismaClient.inspection.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                take: 80,
            }),
            prismaClient.propertyListingHistory.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
        ]);

        const transactionIds = new Set(transactions.map(t => t.id));

        for (const t of transactions) {
            const amount = Number(t.amount) || 0;
            const isCredit = t.type === TransactionType.CREDIT;
            events.push({
                id: `tx-${t.id}`,
                date: new Date(t.createdAt).toISOString().split('T')[0],
                createdAt: t.createdAt,
                category: isCredit ? 'Income' : 'Expense',
                event: this.formatTransactionEventLabel(t.reference, t.description),
                amount: isCredit ? amount : -amount,
                status: t.status,
            });
        }

        for (const log of logs) {
            if (log.transactionId && transactionIds.has(log.transactionId)) {
                continue;
            }
            events.push({
                id: `log-${log.id}`,
                date: new Date(log.createdAt).toISOString().split('T')[0],
                createdAt: log.createdAt,
                category: this.formatLogCategory(log.type),
                event: log.events,
                status: log.status ?? undefined,
            });
        }

        for (const m of maintenanceRows) {
            const categoryLabel = m.category?.name;
            events.push({
                id: `maint-${m.id}`,
                date: new Date(m.createdAt).toISOString().split('T')[0],
                createdAt: m.createdAt,
                category: 'Maintenance',
                event: categoryLabel ? `${categoryLabel} — ${m.description}` : m.description,
                amount: m.amount ? -Number(m.amount) : undefined,
                status: m.status,
            });
        }

        for (const app of applications) {
            const statusLabel = app.status
                ? app.status.replace(/_/g, ' ').toLowerCase()
                : 'submitted';
            events.push({
                id: `app-${app.id}`,
                date: new Date(app.createdAt).toISOString().split('T')[0],
                createdAt: app.createdAt,
                category: 'Application',
                event: `Tenant application ${statusLabel}`,
                status: app.status ?? undefined,
            });
        }

        for (const tenant of tenantRows) {
            const label = this.formatTenantTimelineLabel(tenant);
            events.push({
                id: `tenant-${tenant.id}`,
                date: tenant.createdAt.toISOString().split('T')[0],
                createdAt: tenant.createdAt,
                category: 'Tenant',
                event: `Tenant added — ${label}`,
                status: tenant.isCurrentLease ? 'ACTIVE' : 'INACTIVE',
            });
        }

        for (const inspection of inspectionRows) {
            const typeLabel = inspection.type?.trim() || 'Inspection';
            const scheduled =
                inspection.scheduledDate != null
                    ? new Date(inspection.scheduledDate).toLocaleDateString('en-GB')
                    : null;

            events.push({
                id: `insp-booked-${inspection.id}`,
                date: inspection.createdAt.toISOString().split('T')[0],
                createdAt: inspection.createdAt,
                category: 'Inspection',
                event: scheduled
                    ? `${typeLabel} booked for ${scheduled}`
                    : `${typeLabel} booked`,
                status: inspection.status ?? 'Scheduled',
            });

            if (inspection.completedAt) {
                events.push({
                    id: `insp-done-${inspection.id}`,
                    date: inspection.completedAt.toISOString().split('T')[0],
                    createdAt: inspection.completedAt,
                    category: 'Inspection',
                    event: `${typeLabel} completed`,
                    status: 'Completed',
                });
            } else if (
                inspection.status &&
                inspection.status.toLowerCase() === 'completed'
            ) {
                events.push({
                    id: `insp-done-${inspection.id}`,
                    date: (inspection.updatedAt ?? inspection.createdAt)
                        .toISOString()
                        .split('T')[0],
                    createdAt: inspection.updatedAt ?? inspection.createdAt,
                    category: 'Inspection',
                    event: `${typeLabel} completed`,
                    status: 'Completed',
                });
            }
        }

        for (const listing of listingRows) {
            const createdAt = listing.createdAt ?? new Date();
            const listed = listing.onListing && listing.isActive;
            const listAs = listing.listAs
                ? listing.listAs.replace(/_/g, ' ').toLowerCase()
                : 'property';
            events.push({
                id: `listing-${listing.id}`,
                date: createdAt.toISOString().split('T')[0],
                createdAt,
                category: 'Listing',
                event: listed
                    ? `Listed for rent (${listAs})`
                    : 'Removed from listings',
                status: listed ? 'ACTIVE' : 'INACTIVE',
            });
        }

        events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return events.slice(0, 250).map(({ createdAt, ...rest }) => rest);
    }

    private formatTenantTimelineLabel(tenant: {
        tenantCode?: string | null;
        tenantWebUserEmail?: string | null;
        user?: {
            email?: string | null;
            profile?: {
                fullname?: string | null;
                firstName?: string | null;
                lastName?: string | null;
            } | null;
        } | null;
    }): string {
        const profile = tenant.user?.profile;
        const name =
            profile?.fullname?.trim() ||
            [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
            tenant.tenantWebUserEmail ||
            tenant.user?.email ||
            'Tenant';
        return tenant.tenantCode ? `${name} (${tenant.tenantCode})` : name;
    }

    private formatTransactionEventLabel(
        reference: string,
        description?: string | null
    ): string {
        if (description?.trim()) return description.trim();

        const labels: Record<string, string> = {
            RENT_PAYMENT: 'Rent payment received',
            RECEIVE_PAYMENT: 'Payment received',
            RENT_DUE: 'Rent due',
            MAINTENANCE_FEE: 'Maintenance fee',
            LATE_FEE: 'Late fee',
            CHARGES: 'Charge',
            BILL_PAYMENT: 'Bill payment',
            LANDLORD_PAYOUT: 'Landlord payout',
            FUND_WALLET: 'Wallet funded',
            WITHDRAWAL: 'Withdrawal',
            MAKE_PAYMENT: 'Payment made',
            SUPPLIES: 'Supplies',
            EQUIPMENTS: 'Equipment',
            TRANSFER: 'Transfer',
            PAYOUT: 'Payout',
            ADS_PAYMENT: 'Ads payment',
        };
        return labels[reference] ?? reference.replace(/_/g, ' ').toLowerCase();
    }

    private formatLogCategory(type: string | null): string {
        if (!type) return 'Activity';
        const map: Record<string, string> = {
            MAINTENANCE: 'Maintenance',
            APPLICATION: 'Application',
            TRANSACTION: 'Transaction',
            FEEDBACK: 'Feedback',
            ACTIVITY: 'Activity',
            VIEW: 'View',
            ENQUIRED: 'Enquiry',
            CALL: 'Call',
            MESSAGE: 'Message',
            EMAIL: 'Email',
        };
        return map[type] ?? type;
    }

    private calculatePropertyOccupancy(property: {
        availability?: string | null;
        tenants?: unknown[];
        specification?: Array<{
            residential?: {
                unitConfigurations?: Array<{
                    availability?: string | null;
                    tenants?: unknown[];
                }>;
                roomDetails?: Array<{
                    availability?: string | null;
                    tenants?: unknown[];
                }>;
            } | null;
            commercial?: {
                unitConfigurations?: Array<{
                    availability?: string | null;
                    tenants?: unknown[];
                }>;
                roomDetails?: Array<{
                    availability?: string | null;
                    tenants?: unknown[];
                }>;
            } | null;
            shortlet?: {
                roomDetails?: Array<{
                    availability?: string | null;
                    tenants?: unknown[];
                }>;
            } | null;
        }>;
    }) {
        let totalUnits = 0;
        let occupiedUnits = 0;

        const slotOccupied = (slot: {
            availability?: string | null;
            tenants?: unknown[];
        }) =>
            slot.availability === 'OCCUPIED' || (slot.tenants?.length ?? 0) > 0;

        const countSlot = (slot: {
            availability?: string | null;
            tenants?: unknown[];
        }) => {
            totalUnits += 1;
            if (slotOccupied(slot)) occupiedUnits += 1;
        };

        for (const spec of property.specification ?? []) {
            const res = spec.residential;
            const com = spec.commercial;
            const sh = spec.shortlet;

            res?.unitConfigurations?.forEach(countSlot);
            res?.roomDetails?.forEach(countSlot);
            com?.unitConfigurations?.forEach(countSlot);
            com?.roomDetails?.forEach(countSlot);
            sh?.roomDetails?.forEach(countSlot);
        }

        if (totalUnits === 0) {
            totalUnits = 1;
            const propertyOccupied =
                property.availability === 'OCCUPIED' ||
                (property.tenants?.length ?? 0) > 0;
            occupiedUnits = property.availability === 'VACANT' ? 0 : propertyOccupied ? 1 : 0;
        }

        const occupancyRate =
            totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

        return {
            totalUnits,
            occupiedUnits,
            vacantUnits: Math.max(0, totalUnits - occupiedUnits),
            occupancyRate,
        };
    }

    private buildPropertyIncomeBreakdown(credits: Array<{ reference: string; amount: unknown }>) {
        const buckets = { rent: 0, charges: 0, lateFees: 0, other: 0 };
        const rentRefs = new Set(['RENT_PAYMENT', 'RECEIVE_PAYMENT']);
        const chargeRefs = new Set(['CHARGES']);
        const lateRefs = new Set(['LATE_FEE']);

        for (const t of credits) {
            const amount = Number(t.amount) || 0;
            if (rentRefs.has(t.reference)) buckets.rent += amount;
            else if (chargeRefs.has(t.reference)) buckets.charges += amount;
            else if (lateRefs.has(t.reference)) buckets.lateFees += amount;
            else buckets.other += amount;
        }
        return buckets;
    }

    private buildPropertyExpenseBreakdown(debits: Array<{ reference: string; amount: unknown }>) {
        const buckets = { maintenance: 0, utilities: 0, taxes: 0, other: 0 };
        const maintenanceRefs = new Set(['MAINTENANCE_FEE']);
        const utilityRefs = new Set(['BILL_PAYMENT']);
        const taxRefs = new Set(['LANDLORD_PAYOUT', 'ADS_PAYMENT']);

        for (const t of debits) {
            const amount = Number(t.amount) || 0;
            if (maintenanceRefs.has(t.reference)) buckets.maintenance += amount;
            else if (utilityRefs.has(t.reference)) buckets.utilities += amount;
            else if (taxRefs.has(t.reference)) buckets.taxes += amount;
            else buckets.other += amount;
        }
        return buckets;
    }

    private resolvePropertySourceCurrency(property: {
        currency?: string | null;
        country?: string | null;
    }): string {
        const explicit = normalizeCurrencyCode(property.currency);
        if (explicit) return explicit;

        const fromCountry = getCurrencyForCountry(property.country);
        if (fromCountry) return fromCountry;

        return PLATFORM_DEFAULT_CURRENCY;
    }

    private calculateListedMonthlyRent(property: {
        price?: unknown;
        specification?: Array<{
            residential?: {
                unitConfigurations?: Array<{ price?: string | null; isDeleted?: boolean }>;
                roomDetails?: Array<{ price?: string | null; isDeleted?: boolean }>;
            } | null;
            commercial?: {
                unitConfigurations?: Array<{ price?: string | null; isDeleted?: boolean }>;
                roomDetails?: Array<{ price?: string | null; isDeleted?: boolean }>;
            } | null;
            shortlet?: {
                roomDetails?: Array<{ price?: string | null; isDeleted?: boolean }>;
            } | null;
        }>;
    }): number {
        const propertyPrice = Number(property.price);
        if (Number.isFinite(propertyPrice) && propertyPrice > 0) {
            return propertyPrice;
        }

        let total = 0;
        let slots = 0;

        const addPrice = (price?: string | null) => {
            const n = Number(price);
            if (Number.isFinite(n) && n > 0) {
                total += n;
                slots += 1;
            }
        };

        for (const spec of property.specification ?? []) {
            spec.residential?.unitConfigurations
                ?.filter(u => !u.isDeleted)
                .forEach(u => addPrice(u.price));
            spec.residential?.roomDetails
                ?.filter(r => !r.isDeleted)
                .forEach(r => addPrice(r.price));
            spec.commercial?.unitConfigurations
                ?.filter(u => !u.isDeleted)
                .forEach(u => addPrice(u.price));
            spec.commercial?.roomDetails
                ?.filter(r => !r.isDeleted)
                .forEach(r => addPrice(r.price));
            spec.shortlet?.roomDetails
                ?.filter(r => !r.isDeleted)
                .forEach(r => addPrice(r.price));
        }

        if (slots > 0) return total;
        return 0;
    }

    private calculateMonthlyRentCollected(
        credits: Array<{ reference: string; amount: unknown; createdAt: Date }>
    ): number {
        const rentRefs = new Set(['RENT_PAYMENT', 'RECEIVE_PAYMENT']);
        const now = new Date();
        return credits
            .filter(t => {
                if (!rentRefs.has(t.reference)) return false;
                const d = new Date(t.createdAt);
                return (
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear()
                );
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    private buildPropertyRentTrend(
        transactions: Array<{
            type: string;
            reference: string;
            amount: unknown;
            createdAt: Date;
        }>,
        monthCount: number
    ) {
        const rentRefs = new Set(['RENT_PAYMENT', 'RECEIVE_PAYMENT']);
        const rows: Array<{
            month: string;
            amount: number;
            changePercent: number;
            direction: 'up' | 'down' | 'flat';
        }> = [];
        const now = new Date();
        let previousAmount = 0;

        for (let i = monthCount - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(
                now.getFullYear(),
                now.getMonth() - i + 1,
                0,
                23,
                59,
                59,
                999
            );
            const label = monthStart.toLocaleString('en-US', {
                month: 'short',
                year: '2-digit',
            });

            const amount = transactions
                .filter(t => {
                    const d = new Date(t.createdAt);
                    return d >= monthStart && d <= monthEnd;
                })
                .filter(t => t.type === TransactionType.CREDIT && rentRefs.has(t.reference))
                .reduce((sum, t) => sum + Number(t.amount), 0);

            let changePercent = 0;
            let direction: 'up' | 'down' | 'flat' = 'flat';

            if (previousAmount > 0) {
                changePercent =
                    Math.round(((amount - previousAmount) / previousAmount) * 1000) /
                    10;
                if (amount > previousAmount) direction = 'up';
                else if (amount < previousAmount) direction = 'down';
            } else if (amount > 0 && previousAmount === 0) {
                changePercent = 100;
                direction = 'up';
            }

            rows.push({ month: label, amount, changePercent, direction });
            previousAmount = amount;
        }

        return rows;
    }

    private buildRentTrendSummary(
        rentTrend: Array<{
            month: string;
            amount: number;
            changePercent: number;
            direction: 'up' | 'down' | 'flat';
        }>
    ) {
        const withData = rentTrend.filter(r => r.amount > 0);
        const first = withData[0]?.amount ?? rentTrend[0]?.amount ?? 0;
        const last =
            withData[withData.length - 1]?.amount ??
            rentTrend[rentTrend.length - 1]?.amount ??
            0;

        let changePercent = 0;
        let direction: 'up' | 'down' | 'flat' = 'flat';

        if (first > 0) {
            changePercent = Math.round(((last - first) / first) * 1000) / 10;
            if (last > first) direction = 'up';
            else if (last < first) direction = 'down';
        } else if (last > 0) {
            changePercent = 100;
            direction = 'up';
        }

        return {
            firstMonthAmount: first,
            lastMonthAmount: last,
            changePercent,
            direction,
        };
    }

    private buildPropertyMonthlySeries(
        transactions: Array<{ type: string; amount: unknown; createdAt: Date }>,
        monthCount: number
    ) {
        const rows: Array<{ month: string; Income: number; Expenses: number }> = [];
        const now = new Date();

        for (let i = monthCount - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
            const label = monthStart.toLocaleString('en-US', { month: 'short', year: '2-digit' });

            const inMonth = transactions.filter(t => {
                const d = new Date(t.createdAt);
                return d >= monthStart && d <= monthEnd;
            });

            const income = inMonth
                .filter(t => t.type === TransactionType.CREDIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const expenses = inMonth
                .filter(t => t.type === TransactionType.DEBIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            rows.push({ month: label, Income: income, Expenses: expenses });
        }
        return rows;
    }

    private buildMaintenanceExpenseRows(
        maintenance: Array<{
            id: string;
            createdAt: Date;
            description: string;
            amount: unknown;
            category?: { name: string } | null;
            vendor?: {
                user?: { email?: string; profile?: { fullname?: string } | null } | null;
            } | null;
        }>
    ) {
        return maintenance.map(m => {
            const vendorName =
                m.vendor?.user?.profile?.fullname ||
                m.vendor?.user?.email ||
                'In-house';
            return {
                id: m.id,
                date: m.createdAt.toISOString().split('T')[0],
                category: m.category?.name || 'Maintenance',
                description: m.description,
                vendor: vendorName,
                cost: Number(m.amount ?? 0),
            };
        });
    }

    private buildRentHistoryRows(
        credits: Array<{ id: string; reference: string; amount: unknown; createdAt: Date; description?: string | null }>
    ) {
        const rentPayments = credits
            .filter(t => t.reference === 'RENT_PAYMENT' || t.reference === 'RECEIVE_PAYMENT')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return rentPayments.map((t, index) => {
            const price = Number(t.amount) || 0;
            const prev = rentPayments[index + 1];
            const prevPrice = prev ? Number(prev.amount) || 0 : 0;
            const percentage =
                prevPrice > 0 ? `${(((price - prevPrice) / prevPrice) * 100).toFixed(1)}%` : '—';

            return {
                id: t.id,
                date: new Date(t.createdAt).toISOString().split('T')[0],
                event: t.description || 'Rent payment',
                price,
                percentage,
            };
        });
    }

    private calculateMonthlyExpenses(transactions: any[]): number {
        const monthlyTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.createdAt);
            const currentDate = new Date();
            return (
                transactionDate.getMonth() === currentDate.getMonth() &&
                transactionDate.getFullYear() === currentDate.getFullYear()
            );
        });
        return monthlyTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    // Property Listing Analytics - for property rental website analytics
    async getPropertyListingAnalytics(landlordId: string, propertyId: string, period: string = '30days') {
        const startDate = this.getPeriodStartDate(period);

        // Get property details (minimal include to reduce connection usage)
        const property = await prismaClient.properties.findFirst({
            where: { id: propertyId, landlordId },
            select: {
                id: true,
                name: true
            }
        });

        if (!property) {
            throw new Error('Property not found');
        }

        // Get analytics data - optimized to reduce parallel queries
        // Execute queries sequentially in batches to avoid connection pool exhaustion
        // Batch 1: Views, clicks, and engagement (can be combined)
        const [viewsAndClicks, engagementData] = await Promise.all([
            this.getPropertyViewsAndClicks(propertyId, startDate),
            this.getPropertyEngagement(propertyId, startDate)
        ]);

        // Batch 2: Traffic data (includes visits calculation)
        const trafficAndVisits = await this.getPropertyTrafficAndVisits(propertyId, startDate);

        // Batch 3: Recent activity (separate due to include)
        const recentActivity = await this.getPropertyRecentActivity(propertyId, startDate);

        const totalViews = viewsAndClicks.views;
        const totalClicks = viewsAndClicks.clicks;
        const totalEngagement = engagementData;
        const totalTimeSpent = viewsAndClicks.views * 2; // Estimate 2 minutes per view
        const totalVisits = trafficAndVisits.visits;
        const trafficData = trafficAndVisits.trafficData;

        // Calculate engagement rate
        const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

        // Calculate average time spent per visit
        const averageTimeSpent = totalVisits > 0 ? totalTimeSpent / totalVisits : 0;

        return {
            propertyId: property.id,
            propertyName: property.name,
            analytics: {
                totalViews,
                totalClicks,
                totalEngagement,
                engagementRate: Math.round(engagementRate * 100) / 100,
                totalTimeSpent: Math.round(totalTimeSpent * 100) / 100,
                averageTimeSpent: Math.round(averageTimeSpent * 100) / 100,
                totalVisits,
                trafficData,
                recentActivity,
                period,
                lastUpdated: new Date().toISOString()
            }
        };
    }

    // Combined method to get views and clicks in a single aggregated query
    private async getPropertyViewsAndClicks(propertyId: string, startDate: Date) {
        // Use a single query with aggregation to reduce connections
        const [viewsResult, clicksResult] = await Promise.all([
            prismaClient.log.count({
                where: {
                    propertyId,
                    type: 'VIEW',
                    createdAt: { gte: startDate }
                }
            }),
            prismaClient.log.count({
                where: {
                    propertyId,
                    type: { in: ['ENQUIRED', 'ACTIVITY'] },
                    createdAt: { gte: startDate }
                }
            })
        ]);
        return { views: viewsResult, clicks: clicksResult };
    }

    private async getPropertyEngagement(propertyId: string, startDate: Date): Promise<number> {
        // Count engagement activities (likes, saves, enquiries, messages) - combined query
        const [engagement, likes] = await Promise.all([
            prismaClient.log.count({
                where: {
                    propertyId,
                    type: { in: ['ENQUIRED', 'ACTIVITY', 'FEEDBACK'] },
                    createdAt: { gte: startDate }
                }
            }),
            prismaClient.userLikedProperty.count({
                where: {
                    propertyId,
                    createdAt: { gte: startDate }
                }
            })
        ]);

        return engagement + likes;
    }

    // Combined method to get traffic data and visits in a single optimized query
    private async getPropertyTrafficAndVisits(propertyId: string, startDate: Date) {
        // Use a single raw query to get both traffic data and unique visits
        const trafficData = await prismaClient.$queryRaw<Array<{
            date: Date;
            views: bigint;
            unique_visitors: bigint;
        }>>`
            SELECT 
                DATE("createdAt") as date,
                COUNT(*)::bigint as views,
                COUNT(DISTINCT "createdById")::bigint as unique_visitors
            FROM "Log"
            WHERE "propertyId" = ${propertyId}
                AND type = 'VIEW'
                AND "createdAt" >= ${startDate}
            GROUP BY DATE("createdAt")
            ORDER BY date DESC
            LIMIT 30
        `;

        // Calculate total unique visits from the traffic data
        const totalUniqueVisits = trafficData.length > 0 
            ? Number(trafficData.reduce((sum, day) => sum + day.unique_visitors, BigInt(0)))
            : 0;

        // Get traffic sources (this would be enhanced with actual tracking)
        const trafficSources = {
            direct: Math.floor(Math.random() * 50) + 20, // Placeholder
            search: Math.floor(Math.random() * 30) + 15,
            social: Math.floor(Math.random() * 20) + 5,
            referral: Math.floor(Math.random() * 15) + 3
        };

        return {
            visits: totalUniqueVisits,
            trafficData: {
                dailyViews: trafficData.map(day => ({
                    date: day.date.toISOString(),
                    views: Number(day.views),
                    unique_visitors: Number(day.unique_visitors)
                })),
                trafficSources,
                topReferrers: [
                    { source: 'Google Search', visitors: Math.floor(Math.random() * 100) + 50 },
                    { source: 'Facebook', visitors: Math.floor(Math.random() * 50) + 20 },
                    { source: 'Direct', visitors: Math.floor(Math.random() * 80) + 30 },
                    { source: 'Property Websites', visitors: Math.floor(Math.random() * 40) + 15 }
                ]
            }
        };
    }

    private async getPropertyRecentActivity(propertyId: string, startDate: Date) {
        const recentActivity = await prismaClient.log.findMany({
            where: {
                propertyId,
                createdAt: { gte: startDate }
            },
            include: {
                users: {
                    select: {
                        email: true,
                        profile: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        return recentActivity.map(activity => ({
            id: activity.id,
            type: activity.type,
            event: activity.events,
            user: activity.users?.email || 'Anonymous',
            timestamp: activity.createdAt,
            status: activity.status
        }));
    }

    // Helper Methods
    private async getTotalProperties(landlordId: string): Promise<number> {
        return prismaClient.properties.count({
            where: { landlordId, isDeleted: false },
        });
    }

    /** Property-level occupancy & shortlet counts (not units/rooms). */
    private async getPortfolioBreakdown(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId, isDeleted: false },
            select: {
                availability: true,
                specificationType: true,
            },
        });

        let occupiedProperties = 0;
        let vacantProperties = 0;
        let unspecifiedProperties = 0;
        let shortletCount = 0;
        let shortletOccupied = 0;
        let shortletVacant = 0;

        for (const property of properties) {
            const spec = String(property.specificationType ?? '').toUpperCase();
            const availability = String(property.availability ?? '')
                .trim()
                .toUpperCase();

            if (spec === 'SHORTLET') {
                shortletCount += 1;
                if (availability === 'OCCUPIED') shortletOccupied += 1;
                else if (availability === 'VACANT') shortletVacant += 1;
            }

            if (availability === 'OCCUPIED') occupiedProperties += 1;
            else if (availability === 'VACANT') vacantProperties += 1;
            else unspecifiedProperties += 1;
        }

        const total = properties.length;
        const occupancyRate =
            total > 0
                ? Math.round((occupiedProperties / total) * 1000) / 10
                : 0;

        return {
            occupiedProperties,
            vacantProperties,
            unspecifiedProperties,
            shortletCount,
            shortletOccupied,
            shortletVacant,
            occupancyRate,
        };
    }

    private async getTotalTenants(landlordId: string): Promise<number> {
        return prismaClient.tenants.count({
            where: {
                landlordId,
                isCurrentLease: true
            }
        });
    }

    private async getTotalRevenue(landlordId: string): Promise<number> {
        const result = await prismaClient.transaction.aggregate({
            where: {
                property: { landlordId },
                type: 'CREDIT',
                reference: { in: ['RENT_PAYMENT', 'MAINTENANCE_FEE', 'LANDLORD_PAYOUT'] }
            },
            _sum: { amount: true }
        });
        return Number(result._sum.amount) || 0;
    }

    private async getOccupancyRate(landlordId: string): Promise<number> {
        const breakdown = await this.getPortfolioBreakdown(landlordId);
        return breakdown.occupancyRate;
    }

    private async getMaintenanceRequestsCount(landlordId: string): Promise<number> {
        return prismaClient.maintenance.count({
            where: {
                landlordId
            }
        });
    }

    private async getRentCollectionRate(landlordId: string): Promise<number> {
        const startDate = this.getPeriodStartDate('12months');

        const [collectedAgg, overdueAgg] = await Promise.all([
            prismaClient.transaction.aggregate({
                where: {
                    property: { landlordId },
                    reference: TransactionReference.RENT_PAYMENT,
                    status: TransactionStatus.COMPLETED,
                    createdAt: { gte: startDate },
                },
                _sum: { amount: true },
            }),
            prismaClient.transaction.aggregate({
                where: {
                    property: { landlordId },
                    reference: TransactionReference.RENT_DUE,
                    status: TransactionStatus.PENDING,
                    isDue: true,
                },
                _sum: { amount: true },
            }),
        ]);

        const collected = Number(collectedAgg._sum.amount) || 0;
        const overdue = Number(overdueAgg._sum.amount) || 0;
        const denominator = collected + overdue;

        if (denominator <= 0) {
            const activeLeases = await prismaClient.tenants.count({
                where: { landlordId, isCurrentLease: true },
            });
            return activeLeases > 0 && collected > 0 ? 100 : 0;
        }

        return Math.round((collected / denominator) * 1000) / 10;
    }

    private async calculateRevenueGrowth(landlordId: string): Promise<number> {
        const now = new Date();
        const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const incomeReferences: TransactionReference[] = [
            TransactionReference.RENT_PAYMENT,
            TransactionReference.RECEIVE_PAYMENT,
            TransactionReference.MAINTENANCE_FEE,
        ];
        const incomeWhere = {
            property: { landlordId },
            type: TransactionType.CREDIT,
            status: TransactionStatus.COMPLETED,
            reference: { in: incomeReferences },
        };

        const [thisMonth, lastMonth] = await Promise.all([
            prismaClient.transaction.aggregate({
                where: { ...incomeWhere, createdAt: { gte: startThisMonth } },
                _sum: { amount: true },
            }),
            prismaClient.transaction.aggregate({
                where: {
                    ...incomeWhere,
                    createdAt: { gte: startLastMonth, lte: endLastMonth },
                },
                _sum: { amount: true },
            }),
        ]);

        const current = Number(thisMonth._sum.amount) || 0;
        const previous = Number(lastMonth._sum.amount) || 0;
        if (previous <= 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    /** Unit/room occupancy across all properties (multi-unit buildings count each slot). */
    async getUnitPortfolioBreakdown(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId, isDeleted: false },
            select: {
                availability: true,
                tenants: {
                    where: { isCurrentLease: true },
                    select: { id: true },
                },
                specification: {
                    where: { isActive: true },
                    include: {
                        residential: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: {
                                            where: { isCurrentLease: true },
                                            select: { id: true },
                                        },
                                    },
                                },
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: {
                                            where: { isCurrentLease: true },
                                            select: { id: true },
                                        },
                                    },
                                },
                            },
                        },
                        commercial: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: {
                                            where: { isCurrentLease: true },
                                            select: { id: true },
                                        },
                                    },
                                },
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: {
                                            where: { isCurrentLease: true },
                                            select: { id: true },
                                        },
                                    },
                                },
                            },
                        },
                        shortlet: {
                            include: {
                                roomDetails: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: {
                                            where: { isCurrentLease: true },
                                            select: { id: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        let totalUnits = 0;
        let occupiedUnits = 0;

        for (const property of properties) {
            const occ = this.calculatePropertyOccupancy(property);
            totalUnits += occ.totalUnits;
            occupiedUnits += occ.occupiedUnits;
        }

        const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
        const occupancyRate =
            totalUnits > 0
                ? Math.round((occupiedUnits / totalUnits) * 1000) / 10
                : 0;

        return { totalUnits, occupiedUnits, vacantUnits, occupancyRate };
    }

    private async getPendingApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: { in: [ApplicationStatus.PENDING, ApplicationStatus.SUBMITTED] },
            },
        });
    }

    private async getApprovedApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: {
                    in: [
                        ApplicationStatus.APPROVED,
                        ApplicationStatus.ACCEPTED,
                        ApplicationStatus.TENANT_CREATED,
                    ],
                },
            },
        });
    }

    /** ApplicationStatus uses DECLINED (not REJECTED) for rejected applications. */
    private async getRejectedApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: ApplicationStatus.DECLINED,
            },
        });
    }

    private async getTotalApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId }
            }
        });
    }

    private async getTotalFiles(landlordId: string): Promise<number> {
        return prismaClient.propertyDocument.count({
            where: {
                deletedAt: null,
                purgedAt: null,
                properties: { landlordId }
            }
        });
    }

    private async getStorageUsed(landlordId: string): Promise<number> {
        // Calculate total file size for landlord's properties
        const files = await prismaClient.propertyDocument.findMany({
            where: {
                deletedAt: null,
                purgedAt: null,
                properties: { landlordId }
            },
            select: {
                size: true
            }
        });

        const totalSize = files.reduce((sum, file) => {
            const size = file.size ? parseFloat(file.size) : 0;
            return sum + size;
        }, 0);
        return totalSize / (1024 * 1024 * 1024); // Convert to GB
    }

    private async getTotalPortfolioValue(landlordId: string): Promise<number> {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            select: { marketValue: true, price: true }
        });

        return properties.reduce((sum, property) => {
            return sum + Number(property.marketValue || property.price || 0);
        }, 0);
    }

    private async getActiveListings(landlordId: string): Promise<number> {
        return prismaClient.properties.count({
            where: {
                landlordId,
                isDeleted: false,
                isListed: true,
            },
        });
    }

    private async getInactiveListings(landlordId: string): Promise<number> {
        return prismaClient.properties.count({
            where: {
                landlordId,
                isDeleted: false,
                isListed: false,
            },
        });
    }

    private getPeriodStartDate(period: string): Date {
        const now = new Date();
        switch (period) {
            case '3months':
                return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            case '6months':
                return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            case '12months':
                return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            case '24months':
                return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            default:
                return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        }
    }

    private getMonthsForPeriod(period: string): number {
        switch (period) {
            case '3months':
                return 3;
            case '6months':
                return 6;
            case '24months':
                return 24;
            default:
                return 12;
        }
    }

    private formatPeriodLabel(period: string): string {
        switch (period) {
            case '3months':
                return '3 months';
            case '6months':
                return '6 months';
            case '24months':
                return '24 months';
            default:
                return '12 months';
        }
    }

    private calculateMonthlyRevenue(transactions: any[]): number {
        const monthlyTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.createdAt);
            const currentDate = new Date();
            return transactionDate.getMonth() === currentDate.getMonth() &&
                transactionDate.getFullYear() === currentDate.getFullYear();
        });
        return monthlyTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    private calculateAverageRating(ratings: any[]): number {
        if (ratings.length === 0) return 0;
        const sum = ratings.reduce((total, rating) => total + rating.ratingValue, 0);
        return sum / ratings.length;
    }

    private groupByStatus(maintenance: any[]): Record<string, number> {
        return maintenance.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});
    }

    private groupByPriority(maintenance: any[]): Record<string, number> {
        const counts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        for (const item of maintenance) {
            const priority = this.determineMaintenancePriority(item);
            counts[priority] = (counts[priority] || 0) + 1;
        }
        return counts;
    }

    private determineMaintenancePriority(
        maintenance: {
            status?: string;
            description?: string | null;
            scheduleDate?: Date | string | null;
        }
    ): 'HIGH' | 'MEDIUM' | 'LOW' {
        const status = String(maintenance.status ?? '').toUpperCase();
        const description = (maintenance.description ?? '').toLowerCase();

        if (status === 'IN_PROGRESS') return 'HIGH';
        if (description.includes('emergency') || description.includes('urgent')) {
            return 'HIGH';
        }

        if (maintenance.scheduleDate) {
            const daysUntilDue = Math.ceil(
                (new Date(maintenance.scheduleDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue <= 2) return 'HIGH';
            if (daysUntilDue <= 7) return 'MEDIUM';
        }

        if (status === 'PENDING' || status === 'UNASSIGNED') return 'MEDIUM';
        return 'LOW';
    }

    private groupByCategory(maintenance: any[]): Record<string, number> {
        return maintenance.reduce((acc, item) => {
            const category = item.category?.name || 'Unknown';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
    }

    private calculateAverageResolutionTime(maintenance: any[]): number {
        const completedMaintenance = maintenance.filter(m => m.status === 'COMPLETED');
        if (completedMaintenance.length === 0) return 0;

        const totalTime = completedMaintenance.reduce((sum, m) => {
            const startTime = new Date(m.createdAt).getTime();
            const endTime = new Date(m.updatedAt).getTime();
            return sum + (endTime - startTime);
        }, 0);

        return totalTime / completedMaintenance.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    private calculateMaintenanceTrends(maintenance: any[]): any[] {
        // Implementation for maintenance trends
        return [];
    }

    private async getMonthlyIncome(landlordId: string, startDate: Date): Promise<any[]> {
        // Implementation for monthly income calculation
        return [];
    }

    private calculateGrowthRate(monthlyIncome: any[]): number {
        if (monthlyIncome.length < 2) return 0;
        const latest = monthlyIncome[monthlyIncome.length - 1];
        const previous = monthlyIncome[monthlyIncome.length - 2];
        return ((latest.amount - previous.amount) / previous.amount) * 100;
    }

    private calculatePaymentHistory(tenant: any): number {
        // Implementation for payment history calculation based on tenant data
        // This would typically check payment history, on-time payments, etc.
        return 95; // Placeholder - would implement based on actual payment data
    }

    private calculatePerformanceScore(tenant: any): number {
        // Implementation for performance score calculation
        return 85; // Placeholder
    }

    private calculateAverageRent(properties: any[]): number {
        if (properties.length === 0) return 0;
        const rents = properties.map(p => Number(p.price || 0));
        return rents.reduce((sum, rent) => sum + rent, 0) / rents.length;
    }

    private calculateOverallOccupancyRate(properties: any[]): number {
        const totalProperties = properties.length;
        const occupiedProperties = properties.filter(p => p.tenants.length > 0).length;
        return totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
    }

    private calculateRentalYield(properties: any[]): number {
        if (properties.length === 0) return 0;

        const annualRent = properties.reduce((sum, p) => {
            const monthly = Number(p.price) || 0;
            return sum + monthly * 12;
        }, 0);
        const portfolioValue = properties.reduce(
            (sum, p) => sum + Number(p.marketValue || p.price || 0),
            0
        );

        if (portfolioValue <= 0) return 0;
        return Math.round((annualRent / portfolioValue) * 1000) / 10;
    }

    private calculateTotalExpenses(transactions: any[]): number {
        return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    private calculatePropertyProfitMargin(transactions: any[]): number {
        const income = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Number(t.amount), 0);
        return income > 0 ? ((income - expenses) / income) * 100 : 0;
    }

    async getLandlordFinancialCashFlow(userId: string) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);

        // Fetch all landlord transactions for the last 12 months
        const transactions = await prismaClient.transaction.findMany({
            where: {
                userId,
                createdAt: { gte: startOfYear, lte: endOfYear },
                status: TransactionStatus.COMPLETED,
            },
        });

        // Group by month helper
        const monthlyData = Array.from({ length: 12 }).map((_, i) => {
            const monthTransactions = transactions.filter(
                t => new Date(t.createdAt).getMonth() === i
            );

            const income = monthTransactions
                .filter(t => t.type === TransactionType.CREDIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expenses = monthTransactions
                .filter(t => t.type === TransactionType.DEBIT)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            return {
                month: new Date(2024, i, 1).toLocaleString("default", { month: "short" }),
                income,
                expenses,
                net: income - expenses,
            };
        });

        // -----------------------------
        // Income Statistics Breakdown
        // -----------------------------
        const incomeCategories = [TransactionReference.RENT_PAYMENT, TransactionReference.LATE_FEE, TransactionReference.CHARGES];

        const incomeStats = incomeCategories.map(ref => ({
            reference: ref,
            data: Array.from({ length: 12 }).map((_, i) => {
                const filtered = transactions.filter(
                    t =>
                        t.reference === ref &&
                        t.type === TransactionType.CREDIT &&
                        new Date(t.createdAt).getMonth() === i
                );

                return filtered.reduce((sum, t) => sum + Number(t.amount), 0);
            }),
        }));

        // -----------------------------
        // Expense Statistics Breakdown
        // -----------------------------
        const expenseCategories = [TransactionReference.MAINTENANCE_FEE, TransactionReference.SUPPLIES, TransactionReference.EQUIPMENTS];

        const expenseStats = expenseCategories.map(ref => ({
            reference: ref,
            data: Array.from({ length: 12 }).map((_, i) => {
                const filtered = transactions.filter(
                    t =>
                        t.reference === ref &&
                        t.type === TransactionType.DEBIT &&
                        new Date(t.createdAt).getMonth() === i
                );

                return filtered.reduce((sum, t) => sum + Number(t.amount), 0);
            }),
        }));

        // -----------------------------
        // Budget Summary
        // -----------------------------
        const budgets = await prismaClient.budget.findMany({
            where: {
                property: {
                    landlord: {
                        user: { id: userId }
                    }
                },
            },
        });

        const budgetSummary = budgets.map(b => ({
            id: b.id,
            propertyId: b.propertyId,
            transactionType: b.transactionType,
            budgetAmount: b.budgetAmount,
            currentAmount: b.currentAmount,
            usedPercentage: (b.currentAmount / b.budgetAmount) * 100,
            frequency: b.frequency,
            alertThreshold: b.alertThreshold,
        }));

        // -----------------------------
        // Subscription Information
        // -----------------------------
        const subscription = await prismaClient.subscription.findFirst({
            where: { userId },
        });

        // -----------------------------
        // Final Response Structure
        // -----------------------------
        return {
            cashFlow: monthlyData,            // Income + Expenses + Net (12 months)
            incomeStatistics: incomeStats,    // Rent, Late Fee, Charges
            expenseStatistics: expenseStats,  // Maintenance, Supplies, Equipment
            budgets: budgetSummary,           // Budget UI
            subscription: subscription || null,
        };
    }

}

export default new AnalyticsService();