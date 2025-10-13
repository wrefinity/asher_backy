import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import ReportsService from '../services/reports.service';
import { CustomRequest } from '../../utils/types';

class ReportsController {
    // Financial Reports
    async getFinancialReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const { startDate, endDate } = req.query;
            const data = await ReportsService.getFinancialReport(landlordId, startDate as string, endDate as string);
            res.status(200).json(new ApiResponse(200, data, 'Financial report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getRentCollectionReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string;
            const data = await ReportsService.getRentCollectionReport(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Rent collection report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getRentRollReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getRentRollReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Rent roll report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Operational Reports
    async getOccupancyReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string;
            const data = await ReportsService.getOccupancyReport(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Occupancy report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getMaintenanceReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string;
            const data = await ReportsService.getMaintenanceReport(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Maintenance report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getTenantSatisfactionReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getTenantSatisfactionReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Tenant satisfaction report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getLeaseExpirationReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getLeaseExpirationReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Lease expiration report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Business Intelligence Reports
    async getComplianceReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getComplianceReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Compliance report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getMarketingReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string;
            const data = await ReportsService.getMarketingReport(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'Marketing report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getKPIReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const period = req.query.period as string;
            const data = await ReportsService.getKPIReport(landlordId, period);
            res.status(200).json(new ApiResponse(200, data, 'KPI report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPortfolioPerformanceReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getPortfolioPerformanceReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Portfolio performance report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    // Property Reports
    async getTenantReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getTenantReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Tenant report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getPropertyConditionReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getPropertyConditionReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Property condition report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }

    async getLeasingVacancyReport(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.id;
            const data = await ReportsService.getLeasingVacancyReport(landlordId);
            res.status(200).json(new ApiResponse(200, data, 'Leasing vacancy report generated successfully'));
        } catch (error) {
            res.status(500).json(new ApiResponse(500, null, error.message));
        }
    }
}

export default new ReportsController();
