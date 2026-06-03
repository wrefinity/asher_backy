import { Prisma, TransactionReference, TransactionType, TransactionStatus } from '@prisma/client';
import { prismaClient } from '../..';

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
        try {
            // Execute queries in smaller batches to avoid connection pool exhaustion
            // Batch 1: Core property metrics
            const [
                totalProperties,
                totalTenants,
                totalRevenue
            ] = await Promise.all([
                this.getTotalProperties(landlordId),
                this.getTotalTenants(landlordId),
                this.getTotalRevenue(landlordId)
            ]);

            // Batch 2: Additional metrics
            const [
                occupancyRate,
                maintenanceRequests,
                rentCollectionRate
            ] = await Promise.all([
                this.getOccupancyRate(landlordId),
                this.getMaintenanceRequestsCount(landlordId),
                this.getRentCollectionRate(landlordId)
            ]);

            // Batch 3: Application metrics
            const [
                pendingApplications,
                approvedApplications,
                rejectedApplications,
                totalApplications
            ] = await Promise.all([
                this.getPendingApplications(landlordId),
                this.getApprovedApplications(landlordId),
                this.getRejectedApplications(landlordId),
                this.getTotalApplications(landlordId)
            ]);

            // Batch 4: Files and storage
            const [
                totalFiles,
                storageUsed
            ] = await Promise.all([
                this.getTotalFiles(landlordId),
                this.getStorageUsed(landlordId)
            ]);

            // Batch 5: Portfolio and listings
            const [
                totalPortfolioValue,
                activeListings,
                inactiveListings
            ] = await Promise.all([
                this.getTotalPortfolioValue(landlordId),
                this.getActiveListings(landlordId),
                this.getInactiveListings(landlordId)
            ]);

            // Calculate derived values
            const storageAvailable = Math.max(0, 100 - storageUsed);
            const portfolioGrowth = 12.5; // Placeholder
            const totalEquity = totalPortfolioValue * 0.5;
            const equityGrowth = 8.3; // Placeholder
            const averagePropertyValue = totalProperties > 0 ? totalPortfolioValue / totalProperties : 0;
            const roi = totalPortfolioValue > 0 ? (totalRevenue / totalPortfolioValue) * 100 : 0;
            const revenueGrowth = 15; // Placeholder

            return {
                totalProperties,
                totalTenants,
                totalRevenue,
                occupancyRate,
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
                activeListings,
                inactiveListings,
                revenueGrowth,
                userName: 'User' // This should come from user data
            };
        } catch (error) {
            console.error('Error in getDashboardAnalytics:', error);
            // Return default values if database queries fail
            return {
                totalProperties: 0,
                totalTenants: 0,
                totalRevenue: 0,
                occupancyRate: 0,
                maintenanceRequests: 0,
                rentCollectionRate: 0,
                pendingApplications: 0,
                approvedApplications: 0,
                rejectedApplications: 0,
                totalApplications: 0,
                totalFiles: 0,
                storageUsed: 0,
                storageAvailable: 100,
                totalPortfolioValue: 0,
                portfolioGrowth: 0,
                totalEquity: 0,
                equityGrowth: 0,
                averagePropertyValue: 0,
                roi: 0,
                activeListings: 0,
                inactiveListings: 0,
                revenueGrowth: 0,
                userName: 'User'
            };
        }
    }

    async getCashFlowData(landlordId: string, period: string) {
        // Implementation for cash flow data based on period
        const startDate = this.getPeriodStartDate(period);

        const income = await prismaClient.transaction.aggregate({
            where: {
                property: { landlordId },
                type: 'CREDIT',
                reference: { in: ['RENT_PAYMENT', 'MAINTENANCE_FEE', 'LANDLORD_PAYOUT'] },
                createdAt: { gte: startDate }
            },
            _sum: { amount: true }
        });

        const expenses = await prismaClient.transaction.aggregate({
            where: {
                property: { landlordId },
                type: 'DEBIT',
                reference: { in: ['MAINTENANCE_FEE', 'SUPPLIES', 'EQUIPMENTS', 'CHARGES'] },
                createdAt: { gte: startDate }
            },
            _sum: { amount: true }
        });

        return {
            period,
            income: Number(income._sum.amount) || 0,
            expenses: Number(expenses._sum.amount) || 0,
            netFlow: (Number(income._sum.amount) || 0) - (Number(expenses._sum.amount) || 0),
            date: new Date().toISOString()
        };
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
        const averageResolutionTime = this.calculateAverageResolutionTime(maintenance);

        return {
            totalRequests: maintenance.length,
            statusCounts,
            categoryCounts,
            averageResolutionTime,
            trends: this.calculateMaintenanceTrends(maintenance)
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
            where: { landlordId },
            include: {
                tenants: { where: { isCurrentLease: true } },
                transactions: { where: { type: 'CREDIT', reference: 'RENT_PAYMENT' } },
                application: true
            }
        });

        return {
            totalProperties: properties.length,
            occupiedProperties: properties.filter(p => p.tenants.length > 0).length,
            vacantProperties: properties.filter(p => p.tenants.length === 0).length,
            totalApplications: properties.reduce((sum, p) => sum + p.application.length, 0),
            averageRent: this.calculateAverageRent(properties),
            occupancyRate: this.calculateOverallOccupancyRate(properties),
            rentalYield: this.calculateRentalYield(properties),
            totalMonthlyRent: properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
        };
    }

    async getPropertyAnalytics(landlordId: string, propertyId: string) {
        const property = await prismaClient.properties.findFirst({
            where: { id: propertyId, landlordId },
            include: {
                tenants: { where: { isCurrentLease: true } },
                transactions: true,
                maintenance: true,
                ratings: true,
                reviews: true,
                application: {
                    where: { isDeleted: false }
                },
                specification: {
                    include: {
                        residential: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                        Transaction: true,
                                        maintenance: true,
                                        application: { where: { isDeleted: false } },
                                        RoomDetail: {
                                            where: { isDeleted: false },
                                            include: {
                                                tenants: { where: { isCurrentLease: true } },
                                                Transaction: true,
                                                maintenance: true,
                                                application: { where: { isDeleted: false } }
                                            }
                                        }
                                    }
                                },
                                roomDetails: {
                                    where: { isDeleted: false, unitId: null },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                        Transaction: true,
                                        maintenance: true,
                                        application: { where: { isDeleted: false } }
                                    }
                                }
                            }
                        },
                        commercial: {
                            include: {
                                unitConfigurations: {
                                    where: { isDeleted: false },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                        Transaction: true,
                                        maintenance: true,
                                        application: { where: { isDeleted: false } },
                                        RoomDetail: {
                                            where: { isDeleted: false },
                                            include: {
                                                tenants: { where: { isCurrentLease: true } },
                                                Transaction: true,
                                                maintenance: true,
                                                application: { where: { isDeleted: false } }
                                            }
                                        }
                                    }
                                },
                                roomDetails: {
                                    where: { isDeleted: false, unitId: null },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                        Transaction: true,
                                        maintenance: true,
                                        application: { where: { isDeleted: false } }
                                    }
                                }
                            }
                        },
                        shortlet: {
                            include: {
                                roomDetails: {
                                    where: { isDeleted: false, unitId: null },
                                    include: {
                                        tenants: { where: { isCurrentLease: true } },
                                        Transaction: true,
                                        maintenance: true,
                                        application: { where: { isDeleted: false } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!property) {
            throw new Error('Property not found');
        }

        const units = this.getPropertyUnits(property);
        const standaloneRooms = this.getPropertyStandaloneRooms(property);
        const unitAnalytics = units.map(unit => this.buildUnitAnalytics(unit));
        const standaloneRoomAnalytics = standaloneRooms.map(room => this.buildRoomAnalytics(room));
        const allRoomAnalytics = [
            ...unitAnalytics.flatMap(unit => unit.roomAnalytics),
            ...standaloneRoomAnalytics
        ];

        const propertyDirectStats = this.buildAnalyticsStats({
            transactions: property.transactions,
            maintenance: property.maintenance,
            tenants: property.tenants,
            applications: property.application,
            monthlyRent: Number(property.price) || 0,
            ratings: property.ratings,
            reviews: property.reviews,
            entityCount: 1,
            occupiedEntityCount: this.isOccupied(property, property.tenants) ? 1 : 0
        });
        const childStats = this.combineAnalyticsStats([
            ...unitAnalytics.map(unit => unit.stats),
            ...standaloneRoomAnalytics.map(room => room.stats)
        ]);
        const stats = this.combineAnalyticsStats([propertyDirectStats, childStats]);

        return {
            propertyId: property.id,
            propertyName: property.name,
            scope: 'PROPERTY',
            occupancyStatus: stats.occupiedEntityCount > 0 ? 'OCCUPIED' : 'VACANT',
            monthlyRevenue: stats.monthlyRevenue,
            totalExpenses: stats.totalExpenses,
            maintenanceRequests: stats.maintenanceRequests,
            averageRating: stats.averageRating,
            tenantSatisfaction: stats.tenantSatisfaction,
            profitMargin: stats.profitMargin,
            monthlyRent: stats.monthlyRent,
            currentTenants: stats.currentTenants,
            applications: stats.applications,
            occupancyRate: stats.occupancyRate,
            entityCounts: {
                properties: 1,
                units: unitAnalytics.length,
                rooms: allRoomAnalytics.length,
                totalRentableEntities: stats.entityCount,
                occupiedRentableEntities: stats.occupiedEntityCount,
                vacantRentableEntities: stats.entityCount - stats.occupiedEntityCount
            },
            directStats: propertyDirectStats,
            unitAnalytics,
            roomAnalytics: standaloneRoomAnalytics
        };
    }

    async getUnitAnalytics(landlordId: string, unitId: string) {
        const unit = await prismaClient.unitConfiguration.findFirst({
            where: {
                id: unitId,
                isDeleted: false,
                OR: [
                    {
                        ResidentialProperty: {
                            PropertySpecification: {
                                some: {
                                    property: { landlordId }
                                }
                            }
                        }
                    },
                    {
                        CommercialProperty: {
                            PropertySpecification: {
                                some: {
                                    property: { landlordId }
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                tenants: { where: { isCurrentLease: true } },
                Transaction: true,
                maintenance: true,
                application: { where: { isDeleted: false } },
                RoomDetail: {
                    where: { isDeleted: false },
                    include: {
                        tenants: { where: { isCurrentLease: true } },
                        Transaction: true,
                        maintenance: true,
                        application: { where: { isDeleted: false } }
                    }
                }
            }
        });

        if (!unit) {
            throw new Error('Unit not found');
        }

        return this.buildUnitAnalytics(unit);
    }

    async getRoomAnalytics(landlordId: string, roomId: string) {
        const room = await prismaClient.roomDetail.findFirst({
            where: {
                id: roomId,
                isDeleted: false,
                OR: [
                    {
                        unit: {
                            OR: [
                                {
                                    ResidentialProperty: {
                                        PropertySpecification: {
                                            some: {
                                                property: { landlordId }
                                            }
                                        }
                                    }
                                },
                                {
                                    CommercialProperty: {
                                        PropertySpecification: {
                                            some: {
                                                property: { landlordId }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        ResidentialProperty: {
                            PropertySpecification: {
                                some: {
                                    property: { landlordId }
                                }
                            }
                        }
                    },
                    {
                        CommercialProperty: {
                            PropertySpecification: {
                                some: {
                                    property: { landlordId }
                                }
                            }
                        }
                    },
                    {
                        ShortletProperty: {
                            PropertySpecification: {
                                some: {
                                    property: { landlordId }
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                tenants: { where: { isCurrentLease: true } },
                Transaction: true,
                maintenance: true,
                application: { where: { isDeleted: false } }
            }
        });

        if (!room) {
            throw new Error('Room not found');
        }

        return this.buildRoomAnalytics(room);
    }

    private getPropertyUnits(property: any): any[] {
        const unitMap = new Map<string, any>();

        for (const specification of property.specification || []) {
            const units = [
                ...(specification.residential?.unitConfigurations || []),
                ...(specification.commercial?.unitConfigurations || [])
            ];

            for (const unit of units) {
                unitMap.set(unit.id, unit);
            }
        }

        return Array.from(unitMap.values());
    }

    private getPropertyStandaloneRooms(property: any): any[] {
        const roomMap = new Map<string, any>();

        for (const specification of property.specification || []) {
            const rooms = [
                ...(specification.residential?.roomDetails || []),
                ...(specification.commercial?.roomDetails || []),
                ...(specification.shortlet?.roomDetails || [])
            ];

            for (const room of rooms) {
                roomMap.set(room.id, room);
            }
        }

        return Array.from(roomMap.values());
    }

    private buildUnitAnalytics(unit: any) {
        const roomAnalytics = (unit.RoomDetail || []).map((room: any) => this.buildRoomAnalytics(room));
        const unitDirectStats = this.buildAnalyticsStats({
            transactions: unit.Transaction || [],
            maintenance: unit.maintenance || [],
            tenants: unit.tenants || [],
            applications: unit.application || [],
            monthlyRent: this.parseMoney(unit.price),
            entityCount: 1,
            occupiedEntityCount: this.isOccupied(unit, unit.tenants) ? 1 : 0
        });
        const roomStats = this.combineAnalyticsStats(roomAnalytics.map((room: any) => room.stats));
        const stats = this.combineAnalyticsStats([unitDirectStats, roomStats]);

        return {
            unitId: unit.id,
            unitName: unit.unitNumber || unit.unitType || unit.id,
            scope: 'UNIT',
            occupancyStatus: stats.occupiedEntityCount > 0 ? 'OCCUPIED' : 'VACANT',
            monthlyRevenue: stats.monthlyRevenue,
            totalExpenses: stats.totalExpenses,
            maintenanceRequests: stats.maintenanceRequests,
            averageRating: stats.averageRating,
            tenantSatisfaction: stats.tenantSatisfaction,
            profitMargin: stats.profitMargin,
            monthlyRent: stats.monthlyRent,
            currentTenants: stats.currentTenants,
            applications: stats.applications,
            occupancyRate: stats.occupancyRate,
            entityCounts: {
                units: 1,
                rooms: roomAnalytics.length,
                totalRentableEntities: stats.entityCount,
                occupiedRentableEntities: stats.occupiedEntityCount,
                vacantRentableEntities: stats.entityCount - stats.occupiedEntityCount
            },
            directStats: unitDirectStats,
            roomAnalytics,
            stats
        };
    }

    private buildRoomAnalytics(room: any) {
        const stats = this.buildAnalyticsStats({
            transactions: room.Transaction || [],
            maintenance: room.maintenance || [],
            tenants: room.tenants || [],
            applications: room.application || [],
            monthlyRent: this.parseMoney(room.price),
            entityCount: 1,
            occupiedEntityCount: this.isOccupied(room, room.tenants) ? 1 : 0
        });

        return {
            roomId: room.id,
            roomName: room.roomName || room.id,
            unitId: room.unitId,
            scope: 'ROOM',
            occupancyStatus: stats.occupiedEntityCount > 0 ? 'OCCUPIED' : 'VACANT',
            monthlyRevenue: stats.monthlyRevenue,
            totalExpenses: stats.totalExpenses,
            maintenanceRequests: stats.maintenanceRequests,
            averageRating: stats.averageRating,
            tenantSatisfaction: stats.tenantSatisfaction,
            profitMargin: stats.profitMargin,
            monthlyRent: stats.monthlyRent,
            currentTenants: stats.currentTenants,
            applications: stats.applications,
            occupancyRate: stats.occupancyRate,
            stats
        };
    }

    private buildAnalyticsStats(input: {
        transactions?: any[];
        maintenance?: any[];
        tenants?: any[];
        applications?: any[];
        monthlyRent?: number;
        ratings?: any[];
        reviews?: any[];
        entityCount?: number;
        occupiedEntityCount?: number;
    }) {
        const transactions = input.transactions || [];
        const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
        const debitTransactions = transactions.filter(t => t.type === 'DEBIT');
        const entityCount = input.entityCount || 0;
        const occupiedEntityCount = input.occupiedEntityCount || 0;

        return {
            monthlyRevenue: this.calculateMonthlyRevenue(creditTransactions),
            totalExpenses: this.calculateTotalExpenses(debitTransactions),
            maintenanceRequests: (input.maintenance || []).length,
            averageRating: this.calculateAverageRating(input.ratings || []),
            tenantSatisfaction: this.calculateAverageRating(input.reviews || []),
            profitMargin: this.calculatePropertyProfitMargin(transactions),
            monthlyRent: input.monthlyRent || 0,
            currentTenants: (input.tenants || []).length,
            applications: (input.applications || []).length,
            entityCount,
            occupiedEntityCount,
            occupancyRate: entityCount > 0 ? (occupiedEntityCount / entityCount) * 100 : 0
        };
    }

    private combineAnalyticsStats(statsList: any[]) {
        const validStats = statsList.filter(Boolean);
        const totals = validStats.reduce(
            (acc, stats) => ({
                monthlyRevenue: acc.monthlyRevenue + stats.monthlyRevenue,
                totalExpenses: acc.totalExpenses + stats.totalExpenses,
                maintenanceRequests: acc.maintenanceRequests + stats.maintenanceRequests,
                monthlyRent: acc.monthlyRent + stats.monthlyRent,
                currentTenants: acc.currentTenants + stats.currentTenants,
                applications: acc.applications + stats.applications,
                entityCount: acc.entityCount + stats.entityCount,
                occupiedEntityCount: acc.occupiedEntityCount + stats.occupiedEntityCount
            }),
            {
                monthlyRevenue: 0,
                totalExpenses: 0,
                maintenanceRequests: 0,
                monthlyRent: 0,
                currentTenants: 0,
                applications: 0,
                entityCount: 0,
                occupiedEntityCount: 0
            }
        );
        const ratings = validStats.map(stats => stats.averageRating).filter((rating: number) => rating > 0);
        const satisfactionRatings = validStats.map(stats => stats.tenantSatisfaction).filter((rating: number) => rating > 0);

        return {
            ...totals,
            averageRating: ratings.length > 0
                ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
                : 0,
            tenantSatisfaction: satisfactionRatings.length > 0
                ? satisfactionRatings.reduce((sum: number, rating: number) => sum + rating, 0) / satisfactionRatings.length
                : 0,
            profitMargin: totals.monthlyRevenue > 0
                ? ((totals.monthlyRevenue - totals.totalExpenses) / totals.monthlyRevenue) * 100
                : 0,
            occupancyRate: totals.entityCount > 0
                ? (totals.occupiedEntityCount / totals.entityCount) * 100
                : 0
        };
    }

    private isOccupied(entity: any, tenants: any[] = []): boolean {
        return entity?.availability === 'OCCUPIED' || tenants.length > 0;
    }

    private parseMoney(value: any): number {
        return Number(value || 0) || 0;
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
        return prismaClient.properties.count({ where: { landlordId } });
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
        const [totalProperties, occupiedProperties] = await Promise.all([
            prismaClient.properties.count({ where: { landlordId } }),
            prismaClient.tenants.count({
                where: {
                    landlordId,
                    isCurrentLease: true
                }
            })
        ]);
        return totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
    }

    private async getMaintenanceRequestsCount(landlordId: string): Promise<number> {
        return prismaClient.maintenance.count({
            where: {
                landlordId
            }
        });
    }

    private async getRentCollectionRate(landlordId: string): Promise<number> {
        // Implementation for rent collection rate calculation
        return 95; // Placeholder
    }

    private async getPendingApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: 'PENDING'
            }
        });
    }

    private async getApprovedApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: 'APPROVED'
            }
        });
    }

    private async getRejectedApplications(landlordId: string): Promise<number> {
        return prismaClient.application.count({
            where: {
                properties: { landlordId },
                status: 'REJECTED' as any // Using as any to handle enum type issue
            }
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
                isListed: true
            }
        });
    }

    private async getInactiveListings(landlordId: string): Promise<number> {
        return prismaClient.properties.count({
            where: {
                landlordId,
                isListed: false
            }
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
        const values = ratings
            .map(rating => Number(rating.ratingValue ?? rating.rating ?? 0))
            .filter(rating => rating > 0);

        if (values.length === 0) return 0;

        const sum = values.reduce((total, rating) => total + rating, 0);
        return sum / values.length;
    }

    private groupByStatus(maintenance: any[]): Record<string, number> {
        return maintenance.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});
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
        // Implementation for rental yield calculation
        return 8.5; // Placeholder
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
