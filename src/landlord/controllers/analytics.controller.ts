import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import AnalyticsService from '../services/analytics.service';
import { CustomRequest } from '../../utils/types';
import { prismaClient } from '../..';

class AnalyticsController {
    // Dashboard Analytics
    async getDashboardAnalytics(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await AnalyticsService.getFinancialAnalyticLandlord(landlordId);
            const data2 = await AnalyticsService.getLandlordFinancialCashFlow(landlordId);
            res.status(200).json( ApiResponse.success({ ...data, ...data2 }, 'Financial analytics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }
    async getDashboardAnalyticsx(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await AnalyticsService.getDashboardAnalytics(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Dashboard analytics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getCashFlowData(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string || '12months';
            const data = await AnalyticsService.getCashFlowData(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Cash flow data retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyPerformance(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await AnalyticsService.getPropertyPerformance(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Property performance retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getMaintenanceAnalytics(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await AnalyticsService.getMaintenanceAnalytics(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Maintenance analytics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Financial Analytics
    async getIncomeStatistics(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string || '12months';
            const data = await AnalyticsService.getIncomeStatistics(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Income statistics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getExpenseBreakdown(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string || '12months';
            const data = await AnalyticsService.getExpenseBreakdown(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Expense breakdown retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getFinancialSummary(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string || '12months';
            const data = await AnalyticsService.getFinancialSummary(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Financial summary retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Performance Analytics
    async getTenantPerformanceAnalytics(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const tenantId = req.query.tenantId as string;
            const data = await AnalyticsService.getTenantPerformanceAnalytics(landlordId, tenantId);
            res.status(200).json(new ApiResponse(200, data, 'Tenant performance analytics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getRentalPerformanceAnalytics(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await AnalyticsService.getRentalPerformanceAnalytics(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Rental performance analytics retrieved successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyAnalytics(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const propertyId = req.params.propertyId;
            
            // Get landlordId from user
            let landlordId = null;
            if (req.user?.landlords?.id) {
                // If landlord info is already in the token
                landlordId = req.user.landlords.id;
            } else if (userId) {
                // If not, get it from database
                const landlord = await prismaClient.landlords.findFirst({
                    where: { userId: userId }
                });
                if (landlord) {
                    landlordId = landlord.id;
                }
            }
            
            if (!landlordId) {
                throw new Error('Landlord not found for user');
            }
            
            const data = await AnalyticsService.getPropertyAnalytics(landlordId, propertyId);
            res.status(200).json(new ApiResponse(200, data, 'Property analytics retrieved successfully'));
        } catch (error) {
            console.error('getPropertyAnalytics error:', error);
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyListingAnalytics(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const propertyId = req.params.propertyId;
            const period = req.query.period as string || '30days';
            
            // Get landlordId from user
            let landlordId = null;
            if (req.user?.landlords?.id) {
                // If landlord info is already in the token
                landlordId = req.user.landlords.id;
            } else if (userId) {
                // If not, get it from database
                const landlord = await prismaClient.landlords.findFirst({
                    where: { userId: userId }
                });
                if (landlord) {
                    landlordId = landlord.id;
                }
            }
            
            if (!landlordId) {
                throw new Error('Landlord not found for user');
            }
            
            const data = await AnalyticsService.getPropertyListingAnalytics(landlordId, propertyId, period);
            res.status(200).json(new ApiResponse(200, data, 'Property listing analytics retrieved successfully'));
        } catch (error) {
            console.error('getPropertyListingAnalytics error:', error);
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }
    async getPropertyComparisonData(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const propertyId = req.params.propertyId;
            
            // Get landlordId from user
            let landlordId = null;
            if (req.user?.landlords?.id) {
                landlordId = req.user.landlords.id;
            } else if (userId) {
                const landlord = await prismaClient.landlords.findFirst({
                    where: { userId: userId }
                });
                if (landlord) {
                    landlordId = landlord.id;
                }
            }
            
            if (!landlordId) {
                throw new Error('Landlord not found for user');
            }
            
            // Use the same service method as property listing analytics for now
            // You can create a dedicated method later if needed
            const data = await AnalyticsService.getPropertyListingAnalytics(landlordId, propertyId, '30days');
            res.status(200).json(new ApiResponse(200, data, 'Property comparison data retrieved successfully'));
        } catch (error) {
            console.error('getPropertyComparisonData error:', error);
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyTrendsData(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const propertyId = req.params.propertyId;
            const period = req.query.period as string || '30days';
            
            // Get landlordId from user
            let landlordId = null;
            if (req.user?.landlords?.id) {
                landlordId = req.user.landlords.id;
            } else if (userId) {
                const landlord = await prismaClient.landlords.findFirst({
                    where: { userId: userId }
                });
                if (landlord) {
                    landlordId = landlord.id;
                }
            }
            
            if (!landlordId) {
                throw new Error('Landlord not found for user');
            }
            
            // Use the same service method as property listing analytics
            // You can create a dedicated method later if needed
            const data = await AnalyticsService.getPropertyListingAnalytics(landlordId, propertyId, period);
            res.status(200).json(new ApiResponse(200, data, 'Property trends data retrieved successfully'));
        } catch (error) {
            console.error('getPropertyTrendsData error:', error);
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyApplicationStats(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const propertyId = req.params.propertyId;
            const period = req.query.period as string || '30days';
            
            // Get landlordId from user
            let landlordId = null;
            if (req.user?.landlords?.id) {
                landlordId = req.user.landlords.id;
            } else if (userId) {
                const landlord = await prismaClient.landlords.findFirst({
                    where: { userId: userId }
                });
                if (landlord) {
                    landlordId = landlord.id;
                }
            }
            
            if (!landlordId) {
                throw new Error('Landlord not found for user');
            }
            
            // Get property to verify ownership
            const property = await prismaClient.properties.findFirst({
                where: { id: propertyId, landlordId }
            });

            if (!property) {
                throw new Error('Property not found');
            }

            // Calculate date range based on period
            const startDate = this.getPeriodStartDateHelper(period);
            const now = new Date();

            // Get applications for this property
            const allApplications = await prismaClient.application.findMany({
                where: {
                    propertiesId: propertyId,
                    isDeleted: false,
                    createdAt: { gte: startDate, lte: now }
                }
            });

            // Get enquiries for this property
            const allEnquiries = await prismaClient.propertyEnquiry.findMany({
                where: {
                    propertyId: propertyId,
                    createdAt: { gte: startDate, lte: now }
                }
            });

            // Calculate statistics
            const totalApplications = allApplications.length;
            const totalEnquiries = allEnquiries.length;
            const pendingApplications = allApplications.filter(
                app => app.status === 'PENDING' || app.status === 'SUBMITTED'
            ).length;
            const approvedApplications = allApplications.filter(
                app => app.status === 'APPROVED' || app.status === 'ACCEPTED' || app.status === 'TENANT_CREATED'
            ).length;
            const rejectedApplications = allApplications.filter(
                app => app.status === 'DECLINED'
            ).length;

            // Calculate approval rate
            const approvalRate = totalApplications > 0
                ? (approvedApplications / totalApplications) * 100
                : 0;

            // Get previous period for comparison
            const previousStartDate = this.getPreviousPeriodStartDateHelper(period);
            const previousApplications = await prismaClient.application.count({
                where: {
                    propertiesId: propertyId,
                    isDeleted: false,
                    createdAt: { gte: previousStartDate, lt: startDate }
                }
            });

            const previousEnquiries = await prismaClient.propertyEnquiry.count({
                where: {
                    propertyId: propertyId,
                    createdAt: { gte: previousStartDate, lt: startDate }
                }
            });

            // Calculate changes
            const applicationsChange = previousApplications > 0
                ? ((totalApplications - previousApplications) / previousApplications) * 100
                : totalApplications > 0 ? 100 : 0;

            const enquiriesChange = previousEnquiries > 0
                ? ((totalEnquiries - previousEnquiries) / previousEnquiries) * 100
                : totalEnquiries > 0 ? 100 : 0;

            const data = {
                propertyId: property.id,
                propertyName: property.name,
                period,
                stats: {
                    totalApplications,
                    totalEnquiries,
                    pendingApplications,
                    approvedApplications,
                    rejectedApplications,
                    approvalRate: Math.round(approvalRate * 100) / 100,
                    changes: {
                        applicationsChange: Math.round(applicationsChange * 100) / 100,
                        enquiriesChange: Math.round(enquiriesChange * 100) / 100,
                    },
                    lastUpdated: new Date().toISOString()
                }
            };

            res.status(200).json(new ApiResponse(200, data, 'Property application statistics retrieved successfully'));
        } catch (error) {
            console.error('getPropertyApplicationStats error:', error);
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Helper methods for date calculations
    private getPeriodStartDateHelper(period: string): Date {
        const now = new Date();
        switch (period) {
            case '7days':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30days':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90days':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case '6months':
                return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            case '12months':
                return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }

    private getPreviousPeriodStartDateHelper(period: string): Date {
        const now = new Date();
        switch (period) {
            case '7days':
                return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            case '30days':
                return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            case '90days':
                return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            case '6months':
                return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
            case '12months':
                return new Date(now.getFullYear(), now.getMonth() - 24, now.getDate());
            default:
                return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        }
    }

}

export default new AnalyticsController();
