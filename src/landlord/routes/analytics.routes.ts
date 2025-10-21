import { Router } from "express";
import AnalyticsController from "../controllers/analytics.controller";
import dashboardController from "../controllers/dashboard.controller";

class AnalyticsRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Dashboard Analytics
        this.router.get('/generic', dashboardController.getDashboardStats);
        this.router.get('/dashboard', AnalyticsController.getDashboardAnalytics);
        this.router.get('/cash-flow', AnalyticsController.getCashFlowData);
        this.router.get('/property-performance', AnalyticsController.getPropertyPerformance);
        this.router.get('/maintenance', AnalyticsController.getMaintenanceAnalytics);
        
        // Financial Analytics
        this.router.get('/income', AnalyticsController.getIncomeStatistics);
        this.router.get('/expenses', AnalyticsController.getExpenseBreakdown);
        this.router.get('/financial-summary', AnalyticsController.getFinancialSummary);
        
        // Performance Analytics
        this.router.get('/tenant-performance', AnalyticsController.getTenantPerformanceAnalytics);
        this.router.get('/rental-performance', AnalyticsController.getRentalPerformanceAnalytics);
        this.router.get('/property/:propertyId', AnalyticsController.getPropertyAnalytics);
        this.router.get('/property-listing/:propertyId', AnalyticsController.getPropertyListingAnalytics);
        // this.router.get('/property-application-stats/:propertyId', AnalyticsController.getPropertyApplicationStats);
        // this.router.get('/property-comparison/:propertyId', AnalyticsController.getPropertyComparisonData);
        // this.router.get('/property-trends/:propertyId', AnalyticsController.getPropertyTrendsData);
    }
}

export default new AnalyticsRouter().router;
