import { prismaClient } from "../..";


class ReportsService {
    // Financial Reports
    async getFinancialReport(landlordId: string, startDate?: string, endDate?: string) {
        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const [income, expenses, transactions] = await Promise.all([
            prismaClient.transaction.aggregate({
                where: {
                    property: { landlordId },
                    type: 'CREDIT',
                    ...dateFilter
                },
                _sum: { amount: true },
                _count: true
            }),
            prismaClient.transaction.aggregate({
                where: {
                    property: { landlordId },
                    type: 'DEBIT',
                    ...dateFilter
                },
                _sum: { amount: true },
                _count: true
            }),
            prismaClient.transaction.findMany({
                where: {
                    property: { landlordId },
                    ...dateFilter
                },
                include: {
                    property: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return {
            summary: {
                totalIncome: Number(income._sum.amount) || 0,
                totalExpenses: Number(expenses._sum.amount) || 0,
                netIncome: (Number(income._sum.amount) || 0) - (Number(expenses._sum.amount) || 0),
                transactionCount: (income._count || 0) + (expenses._count || 0)
            },
            transactions: transactions.slice(0, 100), // Limit to recent 100 transactions
            period: startDate && endDate ? { startDate, endDate } : 'All time',
            generatedAt: new Date().toISOString()
        };
    }

    async getRentCollectionReport(landlordId: string, period?: string) {
        const startDate = period ? this.getPeriodStartDate(period) : undefined;
        
        const rentPayments = await prismaClient.transaction.findMany({
            where: {
                property: { landlordId },
                type: 'CREDIT',
                reference: 'RENT_PAYMENT',
                ...(startDate && { createdAt: { gte: startDate } })
            },
            include: {
                property: true,
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalRentCollected = rentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const onTimePayments = rentPayments.filter(p => this.isOnTimePayment(p)).length;
        const latePayments = rentPayments.length - onTimePayments;

        return {
            summary: {
                totalRentCollected,
                totalPayments: rentPayments.length,
                onTimePayments,
                latePayments,
                collectionRate: rentPayments.length > 0 ? (onTimePayments / rentPayments.length) * 100 : 0
            },
            payments: rentPayments,
            period: period || 'All time',
            generatedAt: new Date().toISOString()
        };
    }

    async getRentRollReport(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                tenants: {
                    where: { isCurrentLease: true },
                    include: {
                        user: true
                    }
                }
            }
        });

        const rentRoll = properties.map(property => ({
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            monthlyRent: Number(property.price) || 0,
            tenants: property.tenants.map(tenant => ({
                tenantId: tenant.id,
                tenantName: tenant.user?.email || 'Unknown',
                leaseStart: tenant.leaseStartDate,
                leaseEnd: tenant.leaseEndDate,
                // monthlyRent: Number(tenant.rentAmount) || Number(property.price) || 0
            })),
            occupancyStatus: property.tenants.length > 0 ? 'OCCUPIED' : 'VACANT',
            // totalMonthlyRent: property.tenants.reduce((sum, tenant) => 
            //     sum + (Number(tenant.rentAmount) || Number(property.price) || 0), 0
            // )
        }));

        // const totalMonthlyRent = rentRoll.reduce((sum, property) => sum + property.totalMonthlyRent, 0);
        const occupiedUnits = rentRoll.filter(p => p.occupancyStatus === 'OCCUPIED').length;
        const totalUnits = rentRoll.length;

        return {
            summary: {
                totalProperties: totalUnits,
                occupiedUnits,
                vacantUnits: totalUnits - occupiedUnits,
                occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
                // totalMonthlyRent
            },
            rentRoll,
            generatedAt: new Date().toISOString()
        };
    }

    // Operational Reports
    async getOccupancyReport(landlordId: string, period?: string) {
        const startDate = period ? this.getPeriodStartDate(period) : undefined;
        
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                tenants: {
                    where: { isCurrentLease: true },
                    ...(startDate && { leaseStart: { gte: startDate } })
                }
            }
        });

        const occupancyData = properties.map(property => ({
            propertyId: property.id,
            propertyName: property.name,
            totalUnits: 1, // Assuming 1 unit per property, adjust based on your schema
            occupiedUnits: property.tenants.length,
            vacantUnits: Math.max(0, 1 - property.tenants.length),
            occupancyRate: property.tenants.length > 0 ? 100 : 0,
            monthlyRent: Number(property.price) || 0
        }));

        const totalUnits = occupancyData.reduce((sum, p) => sum + p.totalUnits, 0);
        const occupiedUnits = occupancyData.reduce((sum, p) => sum + p.occupiedUnits, 0);
        const overallOccupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        return {
            summary: {
                totalUnits,
                occupiedUnits,
                vacantUnits: totalUnits - occupiedUnits,
                overallOccupancyRate,
                totalMonthlyRent: occupancyData.reduce((sum, p) => sum + p.monthlyRent, 0)
            },
            properties: occupancyData,
            period: period || 'Current',
            generatedAt: new Date().toISOString()
        };
    }

    async getMaintenanceReport(landlordId: string, period?: string) {
        const startDate = period ? this.getPeriodStartDate(period) : undefined;
        
        const maintenance = await prismaClient.maintenance.findMany({
            where: {
                property: { landlordId },
                ...(startDate && { createdAt: { gte: startDate } })
            },
            include: {
                property: true,
                category: true,
                tenant: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const statusCounts = this.groupByStatus(maintenance);
        const categoryCounts = this.groupByCategory(maintenance);
        const propertyCounts = this.groupByProperty(maintenance);

        // const totalCost = maintenance.reduce((sum, req) => sum + (Number(req.cost) || 0), 0);
        const averageResolutionTime = this.calculateAverageResolutionTime(maintenance);

        return {
            summary: {
                totalRequests: maintenance.length,
                // totalCost,
                averageResolutionTime,
                statusCounts,
                categoryCounts
            },
            requests: maintenance,
            propertyBreakdown: propertyCounts,
            period: period || 'All time',
            generatedAt: new Date().toISOString()
        };
    }

    async getTenantSatisfactionReport(landlordId: string) {
        const tenants = await prismaClient.tenants.findMany({
            where: { landlordId },
            include: {
                reviews: true,
                property: true,
                user: true
            }
        });

        const satisfactionData = tenants.map(tenant => {
            const avgRating = tenant.reviews.length > 0 
                ? tenant.reviews.reduce((sum, review) => sum + review.rating, 0) / tenant.reviews.length 
                : 0;
            
            return {
                tenantId: tenant.id,
                tenantName: tenant.user?.email || 'Unknown',
                propertyName: tenant.property?.name || 'Unknown',
                averageRating: avgRating,
                totalReviews: tenant.reviews.length,
                satisfactionLevel: this.getSatisfactionLevel(avgRating)
            };
        });

        const overallSatisfaction = satisfactionData.length > 0
            ? satisfactionData.reduce((sum, tenant) => sum + tenant.averageRating, 0) / satisfactionData.length
            : 0;

        return {
            summary: {
                totalTenants: tenants.length,
                overallSatisfaction,
                satisfactionLevel: this.getSatisfactionLevel(overallSatisfaction),
                highlySatisfied: satisfactionData.filter(t => t.averageRating >= 4).length,
                moderatelySatisfied: satisfactionData.filter(t => t.averageRating >= 3 && t.averageRating < 4).length,
                dissatisfied: satisfactionData.filter(t => t.averageRating < 3).length
            },
            tenantSatisfaction: satisfactionData,
            generatedAt: new Date().toISOString()
        };
    }

    async getLeaseExpirationReport(landlordId: string) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

        const tenants = await prismaClient.tenants.findMany({
            where: { 
                landlordId,
                isCurrentLease: true
            },
            include: {
                property: true,
                user: true
            }
        });

        const expiringSoon = tenants.filter(tenant => {
            const leaseEnd = new Date(tenant.leaseEndDate || tenant.leaseStartDate);
            return leaseEnd <= thirtyDaysFromNow && leaseEnd > now;
        });

        const expiringLater = tenants.filter(tenant => {
            const leaseEnd = new Date(tenant.leaseEndDate || tenant.leaseStartDate);
            return leaseEnd <= ninetyDaysFromNow && leaseEnd > thirtyDaysFromNow;
        });

        const expired = tenants.filter(tenant => {
            const leaseEnd = new Date(tenant.leaseEndDate || tenant.leaseStartDate);
            return leaseEnd <= now;
        });


        return {
            summary: {
                totalActiveLeases: tenants.length,
                expiringIn30Days: expiringSoon.length,
                expiringIn90Days: expiringLater.length,
                expired: expired.length
            },
            expiringSoon: expiringSoon.map(tenant => ({
                tenantId: tenant.id,
                tenantName: tenant.user?.email || 'Unknown',
                propertyName: tenant.property?.name || 'Unknown',
                leaseEnd: tenant.leaseEndDate,
                daysRemaining: Math.ceil((new Date(tenant.leaseEndDate || tenant.leaseStartDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            })),
            expiringLater: expiringLater.map(tenant => ({
                tenantId: tenant.id,
                tenantName: tenant.user?.email || 'Unknown',
                propertyName: tenant.property?.name || 'Unknown',
                leaseEnd: tenant.leaseEndDate,
                daysRemaining: Math.ceil((new Date(tenant.leaseEndDate || tenant.leaseStartDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            })),
            expired: expired.map(tenant => ({
                tenantId: tenant.id,
                tenantName: tenant.user?.email || 'Unknown',
                propertyName: tenant.property?.name || 'Unknown',
                leaseEnd: tenant.leaseEndDate,
                daysOverdue: Math.ceil((now.getTime() - new Date(tenant.leaseEndDate || tenant.leaseStartDate).getTime()) / (1000 * 60 * 60 * 24))
            })),
            generatedAt: new Date().toISOString()
        };
    }

    // Business Intelligence Reports
    async getComplianceReport(landlordId: string) {
        // This would typically include various compliance checks
        // For now, returning a basic structure
        return {
            summary: {
                totalProperties: 0,
                complianceScore: 0,
                violationsFound: 0,
                recommendations: []
            },
            complianceChecks: [],
            generatedAt: new Date().toISOString()
        };
    }

    async getMarketingReport(landlordId: string, period?: string) {
        const startDate = period ? this.getPeriodStartDate(period) : undefined;
        
        const applications = await prismaClient.application.findMany({
            where: {
                properties: { landlordId },
                ...(startDate && { createdAt: { gte: startDate } })
            },
            include: {
                properties: true
            }
        });

        const conversions = applications.filter(app => app.status === 'APPROVED').length;
        const conversionRate = applications.length > 0 ? (conversions / applications.length) * 100 : 0;

        return {
            summary: {
                totalApplications: applications.length,
                approvedApplications: conversions,
                conversionRate,
                averageTimeToApproval: 0 // Calculate based on your data
            },
            applications: applications.slice(0, 50), // Limit to recent 50
            period: period || 'All time',
            generatedAt: new Date().toISOString()
        };
    }

    async getKPIReport(landlordId: string, period?: string) {
        const startDate = period ? this.getPeriodStartDate(period) : undefined;
        
        const [properties, tenants, transactions, maintenance] = await Promise.all([
            prismaClient.properties.count({ where: { landlordId } }),
            prismaClient.tenants.count({ where: { landlordId, isCurrentLease: true } }),
            prismaClient.transaction.count({ 
                where: { 
                    property: { landlordId },
                    ...(startDate && { createdAt: { gte: startDate } })
                }
            }),
            prismaClient.maintenance.count({ 
                where: { 
                    property: { landlordId },
                    ...(startDate && { createdAt: { gte: startDate } })
                }
            })
        ]);

        const totalRevenue = await prismaClient.transaction.aggregate({
            where: {
                property: { landlordId },
                type: 'CREDIT',
                ...(startDate && { createdAt: { gte: startDate } })
            },
            _sum: { amount: true }
        });

        return {
            summary: {
                // totalProperties,
                // totalTenants,
                occupancyRate: properties > 0 ? (tenants / properties) * 100 : 0,
                totalRevenue: totalRevenue._sum.amount || 0,
                totalTransactions: transactions,
                maintenanceRequests: maintenance,
                // averageRevenuePerProperty: properties > 0 ? (totalRevenue._sum.amount || 0) / properties : 0
            },
            period: period || 'All time',
            generatedAt: new Date().toISOString()
        };
    }

    async getPortfolioPerformanceReport(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                tenants: { where: { isCurrentLease: true } },
                transactions: {
                    where: { type: 'CREDIT' }
                },
                maintenance: true,
                ratings: true
            }
        });

        const portfolioMetrics = properties.map(property => ({
            propertyId: property.id,
            propertyName: property.name,
            monthlyRent: Number(property.price) || 0,
            occupancyRate: property.tenants.length > 0 ? 100 : 0,
            totalRevenue: property.transactions.reduce((sum, t) => sum + Number(t.amount), 0),
            // maintenanceCosts: property.maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0),
            tenantSatisfaction: property.ratings.length > 0 
                ? property.ratings.reduce((sum, r) => sum + r.ratingValue, 0) / property.ratings.length 
                : 0,
            // netIncome: property.transactions.reduce((sum, t) => sum + Number(t.amount), 0) - 
            //           property.maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
        }));

        const totalRevenue = portfolioMetrics.reduce((sum, p) => sum + p.totalRevenue, 0);
        // const totalMaintenanceCosts = portfolioMetrics.reduce((sum, p) => sum + p.maintenanceCosts, 0);
        const averageOccupancyRate = properties.length > 0 
            ? portfolioMetrics.reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length 
            : 0;

        return {
            summary: {
                totalProperties: properties.length,
                totalRevenue,
                // totalMaintenanceCosts,
                // netIncome: totalRevenue - totalMaintenanceCosts,
                averageOccupancyRate,
                // portfolioROI: totalRevenue > 0 ? ((totalRevenue - totalMaintenanceCosts) / totalRevenue) * 100 : 0
            },
            propertyPerformance: portfolioMetrics,
            generatedAt: new Date().toISOString()
        };
    }

    // Property Reports
    async getTenantReport(landlordId: string) {
        const tenants = await prismaClient.tenants.findMany({
            where: { landlordId },
            include: {
                property: true,
                user: true,
                reviews: true,
                violation: true
            }
        });

        const tenantData = tenants.map(tenant => ({
            tenantId: tenant.id,
            tenantName: tenant.user?.email || 'Unknown',
            propertyName: tenant.property?.name || 'Unknown',
            leaseStart: tenant.leaseStartDate,
            leaseEnd: tenant.leaseEndDate,
            monthlyRent: Number(tenant.property?.price) || 0,
            totalPayments: 0, // Would need to query transactions separately
            totalPaid: 0, // Would need to query transactions separately
            averageRating: tenant.reviews.length > 0 
                ? tenant.reviews.reduce((sum, r) => sum + r.rating, 0) / tenant.reviews.length 
                : 0,
            violationsCount: tenant.violation.length,
            isCurrentLease: tenant.isCurrentLease
        }));

        return {
            summary: {
                totalTenants: tenants.length,
                currentTenants: tenants.filter(t => t.isCurrentLease).length,
                formerTenants: tenants.filter(t => !t.isCurrentLease).length,
                totalMonthlyRent: tenantData.filter(t => t.isCurrentLease).reduce((sum, t) => sum + t.monthlyRent, 0)
            },
            tenants: tenantData,
            generatedAt: new Date().toISOString()
        };
    }

    async getPropertyConditionReport(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                maintenance: true,
                inspection: true,
                ratings: true
            }
        });

        const conditionData = properties.map(property => {
            const recentMaintenance = property.maintenance.filter(m => {
                const maintenanceDate = new Date(m.createdAt);
                const sixMonthsAgo = new Date(Date.now() - (6 * 30 * 24 * 60 * 60 * 1000));
                return maintenanceDate >= sixMonthsAgo;
            });

            const averageRating = property.ratings.length > 0 
                ? property.ratings.reduce((sum, r) => sum + r.ratingValue, 0) / property.ratings.length 
                : 0;

            return {
                propertyId: property.id,
                propertyName: property.name,
                address: property.address,
                conditionScore: this.calculateConditionScore(property),
                recentMaintenanceRequests: recentMaintenance.length,
                averageRating,
                lastInspection: property.inspection.length > 0 
                    ? property.inspection[property.inspection.length - 1].createdAt 
                    : null,
                maintenanceHistory: property.maintenance.slice(0, 10) // Recent 10 maintenance requests
            };
        });

        return {
            summary: {
                totalProperties: properties.length,
                averageConditionScore: properties.length > 0 ? conditionData.reduce((sum, p) => sum + p.conditionScore, 0) / properties.length : 0,
                propertiesNeedingAttention: conditionData.filter(p => p.conditionScore < 3).length
            },
            propertyConditions: conditionData,
            generatedAt: new Date().toISOString()
        };
    }

    async getLeasingVacancyReport(landlordId: string) {
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            include: {
                tenants: { where: { isCurrentLease: true } },
                application: true
            }
        });

        const vacancyData = properties.map(property => ({
            propertyId: property.id,
            propertyName: property.name,
            address: property.address,
            monthlyRent: Number(property.price) || 0,
            status: property.tenants.length > 0 ? 'OCCUPIED' : 'VACANT',
            currentTenants: property.tenants.length,
            pendingApplications: property.application.filter(app => app.status === 'PENDING').length,
            totalApplications: property.application.length,
            daysVacant: property.tenants.length === 0 ? 30 : 0 // Placeholder - would calculate based on lease history
        }));

        const totalVacant = vacancyData.filter(p => p.status === 'VACANT').length;
        const totalOccupied = vacancyData.filter(p => p.status === 'OCCUPIED').length;
        const totalLostRent = vacancyData
            .filter(p => p.status === 'VACANT')
            .reduce((sum, p) => sum + (p.monthlyRent * p.daysVacant / 30), 0);

        return {
            summary: {
                totalProperties: properties.length,
                occupiedProperties: totalOccupied,
                vacantProperties: totalVacant,
                occupancyRate: properties.length > 0 ? (totalOccupied / properties.length) * 100 : 0,
                totalLostRent,
                totalPendingApplications: vacancyData.reduce((sum, p) => sum + p.pendingApplications, 0)
            },
            vacancyDetails: vacancyData,
            generatedAt: new Date().toISOString()
        };
    }

    // Helper Methods
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

    private isOnTimePayment(payment: any): boolean {
        // Implementation for checking if payment was on time
        // This would depend on your business logic
        return true; // Placeholder
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

    private groupByProperty(maintenance: any[]): Record<string, number> {
        return maintenance.reduce((acc, item) => {
            const propertyName = item.property?.name || 'Unknown';
            acc[propertyName] = (acc[propertyName] || 0) + 1;
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

    private getSatisfactionLevel(rating: number): string {
        if (rating >= 4) return 'High';
        if (rating >= 3) return 'Medium';
        return 'Low';
    }

    private calculateConditionScore(property: any): number {
        // Implementation for calculating property condition score
        // This would depend on your specific criteria
        return 4; // Placeholder
    }

    private calculateDaysVacant(property: any): number {
        // Implementation for calculating days vacant
        // This would depend on your lease history data
        return 30; // Placeholder - would calculate based on actual lease history
    }
}

export default new ReportsService();
