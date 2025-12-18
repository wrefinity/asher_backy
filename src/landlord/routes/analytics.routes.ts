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
        this.router.get('/dashboard', AnalyticsController.getDashboardAnalytics.bind(AnalyticsController));
        this.router.get('/cash-flow', AnalyticsController.getCashFlowData.bind(AnalyticsController));
        this.router.get('/property-performance', AnalyticsController.getPropertyPerformance.bind(AnalyticsController));
        this.router.get('/maintenance', AnalyticsController.getMaintenanceAnalytics.bind(AnalyticsController));
        
        // Financial Analytics
        this.router.get('/income', AnalyticsController.getIncomeStatistics.bind(AnalyticsController));
        this.router.get('/expenses', AnalyticsController.getExpenseBreakdown.bind(AnalyticsController));
        this.router.get('/financial-summary', AnalyticsController.getFinancialSummary.bind(AnalyticsController));
        
        // Performance Analytics
        this.router.get('/tenant-performance', AnalyticsController.getTenantPerformanceAnalytics.bind(AnalyticsController));
        this.router.get('/rental-performance', AnalyticsController.getRentalPerformanceAnalytics.bind(AnalyticsController));
        this.router.get('/property/:propertyId', AnalyticsController.getPropertyAnalytics.bind(AnalyticsController));
        this.router.get('/property-listing/:propertyId', AnalyticsController.getPropertyListingAnalytics.bind(AnalyticsController));
        this.router.get('/property-application-stats/:propertyId', AnalyticsController.getPropertyApplicationStats.bind(AnalyticsController));
        this.router.get('/property-comparison/:propertyId', AnalyticsController.getPropertyComparisonData.bind(AnalyticsController));
        this.router.get('/property-trends/:propertyId', AnalyticsController.getPropertyTrendsData.bind(AnalyticsController));
    }
}

export default new AnalyticsRouter().router;