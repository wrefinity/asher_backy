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

    // async getPropertyApplicationStats(req: CustomRequest, res: Response) {
    //     try {
    //         const userId = req.user?.id;
    //         const propertyId = req.params.propertyId;
    //         const period = req.query.period as string || '30days';
            
    //         // Get landlordId from user
    //         let landlordId = null;
    //         if (req.user?.landlords?.id) {
    //             landlordId = req.user.landlords.id;
    //         } else if (userId) {
    //             const landlord = await prismaClient.landlords.findFirst({
    //                 where: { userId: userId }
    //             });
    //             if (landlord) {
    //                 landlordId = landlord.id;
    //             }
    //         }
            
    //         if (!landlordId) {
    //             throw new Error('Landlord not found for user');
    //         }
            
    //         const data = await AnalyticsService.getPropertyApplicationStats(landlordId, propertyId, period);
    //         res.status(200).json(new ApiResponse(200, data, 'Property application statistics retrieved successfully'));
    //     } catch (error) {
    //         console.error('getPropertyApplicationStats error:', error);
    //         res.status(500).json(new ApiResponse(500, null, error.message));
    //     }
    // }

    // async getPropertyComparisonData(req: CustomRequest, res: Response) {
    //     try {
    //         const userId = req.user?.id;
    //         const propertyId = req.params.propertyId;
            
    //         // Get landlordId from user
    //         let landlordId = null;
    //         if (req.user?.landlords?.id) {
    //             landlordId = req.user.landlords.id;
    //         } else if (userId) {
    //             const landlord = await prismaClient.landlords.findFirst({
    //                 where: { userId: userId }
    //             });
    //             if (landlord) {
    //                 landlordId = landlord.id;
    //             }
    //         }
            
    //         if (!landlordId) {
    //             throw new Error('Landlord not found for user');
    //         }
            
    //         const data = await AnalyticsService.getPropertyComparisonData(landlordId, propertyId);
    //         res.status(200).json(new ApiResponse(200, data, 'Property comparison data retrieved successfully'));
    //     } catch (error) {
    //         console.error('getPropertyComparisonData error:', error);
    //         res.status(500).json(new ApiResponse(500, null, error.message));
    //     }
    // }

    // async getPropertyTrendsData(req: CustomRequest, res: Response) {
    //     try {
    //         const userId = req.user?.id;
    //         const propertyId = req.params.propertyId;
    //         const period = req.query.period as string || '30days';
            
    //         // Get landlordId from user
    //         let landlordId = null;
    //         if (req.user?.landlords?.id) {
    //             landlordId = req.user.landlords.id;
    //         } else if (userId) {
    //             const landlord = await prismaClient.landlords.findFirst({
    //                 where: { userId: userId }
    //             });
    //             if (landlord) {
    //                 landlordId = landlord.id;
    //             }
    //         }
            
    //         if (!landlordId) {
    //             throw new Error('Landlord not found for user');
    //         }
            
    //         const data = await AnalyticsService.getPropertyTrendsData(landlordId, propertyId, period);
    //         res.status(200).json(new ApiResponse(200, data, 'Property trends data retrieved successfully'));
    //     } catch (error) {
    //         console.error('getPropertyTrendsData error:', error);
    //         res.status(500).json(new ApiResponse(500, null, error.message));
    //     }
    // }
}

export default new AnalyticsController();
