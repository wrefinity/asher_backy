import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import financeControllers from "../controllers/finance.controllers";

class FinanceRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/', financeControllers.getAllFinanceTransaction)
        this.router.get('/income', financeControllers.getFInanceIncome)
        this.router.get('/expenses', financeControllers.getFinancialExpenses)
        this.router.post('/generate-payment-link', financeControllers.generatePaymentLink)
        this.router.get('/income-breakdown', financeControllers.getIncomeBreakdown);
        this.router.get('/expense-breakdown', financeControllers.getExpenseBreakdown);
        this.router.get('/stats', financeControllers.getStats);
        this.router.get('/recent-transactions', financeControllers.getRecentTransactions);
        this.router.get('/upcoming-payments', financeControllers.getUpcomingPayments);

        this.router.post('/budgets', financeControllers.createBudget);
        this.router.put('/budgets/:id', financeControllers.updateBudget);
        this.router.get('/:propertyId/monthly-analysis/:month/:year', financeControllers.getMonthlyAnalysis)
        this.router.get('/:propertyId', financeControllers.getIncomeStatistics)
    }
}

export default new FinanceRouter().router;