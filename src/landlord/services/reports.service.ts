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
        const PropertyOperationalService = (await import('../../services/propertyOperational.service')).default;
        return PropertyOperationalService.getLandlordComplianceSummary(landlordId);
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

    async getRiskAssessmentReport(landlordId: string) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [properties, openMaintenance, tenants, violations] = await Promise.all([
            prismaClient.properties.findMany({
                where: { landlordId, isDeleted: false },
                include: {
                    complianceRecords: { where: { isDeleted: false } },
                    insurancePolicies: { where: { isDeleted: false } },
                    tenants: { where: { isCurrentLease: true } },
                },
            }),
            prismaClient.maintenance.findMany({
                where: {
                    property: { landlordId },
                    status: { not: 'COMPLETED' },
                },
                include: { property: true, category: true },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
            prismaClient.tenants.findMany({
                where: { landlordId, isCurrentLease: true },
                include: { property: true },
            }),
            prismaClient.violation.findMany({
                where: {
                    isDeleted: false,
                    tenant: { landlordId },
                },
                include: { property: true, tenant: true },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
        ]);

        type RiskAssessmentRow = {
            property: string;
            riskType: string;
            description: string;
            likelihood: string;
            impact: string;
            riskLevel: 'High' | 'Medium' | 'Low';
            mitigationStatus: string;
            estimatedCost: string | null;
            targetDate: string | null;
        };

        const riskAssessments: RiskAssessmentRow[] = [];

        for (const property of properties) {
            for (const cert of property.complianceRecords) {
                if (cert.expiryDate && new Date(cert.expiryDate) < now) {
                    riskAssessments.push({
                        property: property.name,
                        riskType: 'Compliance',
                        description: `Expired ${cert.certType} certificate`,
                        likelihood: 'High',
                        impact: 'High',
                        riskLevel: 'High',
                        mitigationStatus: 'Not Started',
                        estimatedCost: null,
                        targetDate: cert.expiryDate?.toISOString?.() ?? null,
                    });
                }
            }

            if (property.insurancePolicies.length === 0) {
                riskAssessments.push({
                    property: property.name,
                    riskType: 'Insurance',
                    description: 'No insurance policy on file',
                    likelihood: 'Medium',
                    impact: 'High',
                    riskLevel: 'High',
                    mitigationStatus: 'Planned',
                    estimatedCost: null,
                    targetDate: null,
                });
            }

            if (property.tenants.length === 0) {
                riskAssessments.push({
                    property: property.name,
                    riskType: 'Financial',
                    description: 'Vacant property — lost rental income',
                    likelihood: 'High',
                    impact: 'Medium',
                    riskLevel: 'Medium',
                    mitigationStatus: 'Monitoring',
                    estimatedCost: null,
                    targetDate: null,
                });
            }
        }

        for (const request of openMaintenance) {
            const riskLevel: RiskAssessmentRow['riskLevel'] =
                request.status === 'UNASSIGNED' ? 'High' : 'Medium';
            riskAssessments.push({
                property: request.property?.name || 'Unknown',
                riskType: request.category?.name || 'Maintenance',
                description: request.description || 'Open maintenance request',
                likelihood: 'Medium',
                impact: riskLevel === 'High' ? 'High' : 'Medium',
                riskLevel,
                mitigationStatus: 'In Progress',
                estimatedCost: request.amount ? String(request.amount) : null,
                targetDate: request.scheduleDate?.toISOString?.() ?? null,
            });
        }

        for (const tenant of tenants) {
            const leaseEnd = tenant.leaseEndDate
                ? new Date(tenant.leaseEndDate)
                : null;
            if (
                leaseEnd &&
                leaseEnd <= thirtyDaysFromNow &&
                leaseEnd > now
            ) {
                riskAssessments.push({
                    property: tenant.property?.name || 'Unknown',
                    riskType: 'Lease',
                    description: 'Lease expiring within 30 days',
                    likelihood: 'High',
                    impact: 'Medium',
                    riskLevel: 'Medium',
                    mitigationStatus: 'Monitoring',
                    estimatedCost: null,
                    targetDate: leaseEnd.toISOString(),
                });
            }
        }

        for (const violation of violations) {
            const severity = violation.severityLevel || 'LOW';
            const riskLevel: RiskAssessmentRow['riskLevel'] =
                severity === 'CRITICAL' || severity === 'EXTREME'
                    ? 'High'
                    : severity === 'SEVERE' || severity === 'MODERATE'
                      ? 'Medium'
                      : 'Low';
            riskAssessments.push({
                property: violation.property?.name || 'Unknown',
                riskType: 'Legal',
                description: violation.description,
                likelihood: 'Medium',
                impact: riskLevel === 'High' ? 'High' : 'Medium',
                riskLevel,
                mitigationStatus:
                    violation.status === 'PENDING' ? 'Not Started' : 'In Progress',
                estimatedCost: violation.amount ? String(violation.amount) : null,
                targetDate: violation.dueDate?.toISOString?.() ?? null,
            });
        }

        const highRisks = riskAssessments.filter((r) => r.riskLevel === 'High').length;
        const mediumRisks = riskAssessments.filter((r) => r.riskLevel === 'Medium').length;
        const lowRisks = riskAssessments.filter((r) => r.riskLevel === 'Low').length;
        const mitigatedRisks = await prismaClient.maintenance.count({
            where: {
                property: { landlordId },
                status: 'COMPLETED',
                updatedAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
            },
        });

        const propertyCount = Math.max(properties.length, 1);
        const rawScore =
            10 - (highRisks * 1.5 + mediumRisks * 0.75 + lowRisks * 0.25) / propertyCount;
        const overallRiskScore = `${Math.max(1, Math.min(10, rawScore)).toFixed(1)}/10`;

        return {
            riskMetrics: {
                totalRisks: String(riskAssessments.length),
                highRisks: String(highRisks),
                mediumRisks: String(mediumRisks),
                lowRisks: String(lowRisks),
                mitigatedRisks: String(mitigatedRisks),
                overallRiskScore,
            },
            riskAssessments,
            generatedAt: new Date().toISOString(),
        };
    }

    async getTaxComplianceReport(
        landlordId: string,
        userId: string,
        year?: number
    ) {
        const filterYear = year || new Date().getFullYear();
        const startDate = new Date(filterYear, 0, 1);
        const endDate = new Date(filterYear + 1, 0, 1);

        const FinanceService = (await import('../services/finance.service')).default;
        const PropertyOperationalService = (await import('../../services/propertyOperational.service')).default;

        const [stats, properties, documents, compliance, incomeTransactions, expenseTransactions] =
            await Promise.all([
                FinanceService.getStats(userId, filterYear),
                prismaClient.properties.findMany({
                    where: { landlordId, isDeleted: false },
                    select: { id: true, name: true },
                }),
                prismaClient.propertyDocument.findMany({
                    where: {
                        deletedAt: null,
                        purgedAt: null,
                        properties: { landlordId },
                    },
                    include: {
                        properties: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                }),
                PropertyOperationalService.getLandlordComplianceSummary(landlordId),
                prismaClient.transaction.findMany({
                    where: {
                        userId,
                        type: 'CREDIT',
                        status: 'COMPLETED',
                        createdAt: { gte: startDate, lt: endDate },
                        propertyId: { not: null },
                    },
                    select: { propertyId: true, amount: true },
                }),
                prismaClient.transaction.findMany({
                    where: {
                        userId,
                        type: 'DEBIT',
                        status: 'COMPLETED',
                        createdAt: { gte: startDate, lt: endDate },
                    },
                    select: { reference: true, amount: true },
                }),
            ]);

        const incomeByProperty: Record<
            string,
            { total: number; propertyName: string }
        > = {};
        for (const property of properties) {
            incomeByProperty[property.id] = {
                total: 0,
                propertyName: property.name,
            };
        }
        for (const tx of incomeTransactions) {
            if (!tx.propertyId || !incomeByProperty[tx.propertyId]) continue;
            incomeByProperty[tx.propertyId].total += Number(tx.amount) || 0;
        }

        const expensesByCategory: Record<string, { total: number }> = {};
        for (const tx of expenseTransactions) {
            const category = tx.reference || 'OTHER';
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = { total: 0 };
            }
            expensesByCategory[category].total += Number(tx.amount) || 0;
        }

        const complianceScore = compliance.summary?.complianceScore ?? 0;
        const complianceStatus =
            complianceScore >= 80
                ? 'Compliant'
                : complianceScore >= 50
                  ? 'Pending'
                  : 'At Risk';

        const mappedDocuments = documents.map((doc) => ({
            id: doc.id,
            docTitle: doc.documentName,
            documentName: doc.documentName,
            docType: doc.docType,
            type: doc.type,
            createdAt: doc.createdAt,
            properties: doc.properties,
        }));

        return {
            summary: {
                totalIncome: stats.totalRevenue,
                totalExpenses: stats.totalExpenses,
                netIncome: stats.netIncome,
                complianceScore,
                complianceStatus,
                outstandingRent: stats.outstandingRent,
            },
            incomeByProperty,
            expensesByCategory,
            complianceChecks: compliance.complianceChecks,
            documents: mappedDocuments,
            year: filterYear,
            generatedAt: new Date().toISOString(),
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
