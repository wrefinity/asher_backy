import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import Joi from "joi";
import tenantFinancialAnalyticsController from "../controllers/financialAnalytics.controller";

class TenantFinancialAnalyticsRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Apply authentication middleware to all routes in this router
    this.router.use(this.authenticateService.authorize);

    // Joi schemas for validation
    const budgetSchema = Joi.object({
      transactionType: Joi.string().valid(
        'RENT_PAYMENT',
        'BILL_PAYMENT', 
        'MAINTENANCE_FEE',
        'LATE_FEE',
        'CHARGES'
      ).required(),
      budgetAmount: Joi.number().positive().required(),
      frequency: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').default('MONTHLY'),
      alertThreshold: Joi.number().min(0.1).max(1.0).default(0.8)
    });

    const paymentHistoryQuerySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      type: Joi.string().valid('all', 'income', 'expense').default('all'),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      category: Joi.string().optional()
    });

    const spendingAnalyticsQuerySchema = Joi.object({
      period: Joi.string().valid('3months', '6months', '12months').default('6months')
    });

    // Routes
    this.router.get("/dashboard", tenantFinancialAnalyticsController.getFinancialDashboard);
    this.router.get("/spending", tenantFinancialAnalyticsController.getSpendingAnalytics);
    this.router.get("/history", tenantFinancialAnalyticsController.getPaymentHistory);
    this.router.get("/budget", tenantFinancialAnalyticsController.getBudgetStatus);
    this.router.post("/budget", validateBody(budgetSchema), tenantFinancialAnalyticsController.setBudget);
    this.router.get("/health", tenantFinancialAnalyticsController.getFinancialHealth);
  }
}

export default new TenantFinancialAnalyticsRouter().router;
