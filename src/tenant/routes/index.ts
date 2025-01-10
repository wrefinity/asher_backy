import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import TenantController from "../controllers/tenant.controller";
import TenantBillRouter from "./tenant-bills.routes"
import TenantDashboardRouter from "./dashboard.routes"
class TenantRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/:tenantId', TenantController.getTenantById)
        this.router.use('/dashboard', TenantDashboardRouter)
        this.router.use('/bills', TenantBillRouter)
    }
}

export default new TenantRouter().router;