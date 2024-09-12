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
        this.router.get('/income/:propertyId', financeControllers.getFInanceIncome)
        this.router.get('/expenses/:propertyId', financeControllers.getFinancialExpenses)
    }
}

export default new FinanceRouter().router;