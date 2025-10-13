import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import ReportsController from "../controllers/reports.controller";

class ReportsRouter {
    public router: Router;
    private authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Financial Reports
        this.router.get('/financial', ReportsController.getFinancialReport);
        this.router.get('/rent-collection', ReportsController.getRentCollectionReport);
        this.router.get('/rent-roll', ReportsController.getRentRollReport);
        
        // Operational Reports
        this.router.get('/occupancy', ReportsController.getOccupancyReport);
        this.router.get('/maintenance', ReportsController.getMaintenanceReport);
        this.router.get('/tenant-satisfaction', ReportsController.getTenantSatisfactionReport);
        this.router.get('/lease-expiration', ReportsController.getLeaseExpirationReport);
        
        // Business Intelligence Reports
        this.router.get('/compliance', ReportsController.getComplianceReport);
        this.router.get('/marketing', ReportsController.getMarketingReport);
        this.router.get('/kpi', ReportsController.getKPIReport);
        this.router.get('/portfolio-performance', ReportsController.getPortfolioPerformanceReport);
        
        // Property Reports
        this.router.get('/tenants', ReportsController.getTenantReport);
        this.router.get('/property-condition', ReportsController.getPropertyConditionReport);
        this.router.get('/leasing-vacancy', ReportsController.getLeasingVacancyReport);
    }
}

export default new ReportsRouter().router;
