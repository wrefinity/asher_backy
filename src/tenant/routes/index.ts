import { Router } from "express";
import { userRoles } from "@prisma/client";
import { Authorize } from "../../middlewares/authorize";
import TenantController from "../controllers/tenant.controller";
import TenantBillRouter from "./tenant-bills.routes";
import MaintenanceRouter from "./maintenance.routes";
import ProfileRouter from "./profile.routes";
import TenantDashboardRouter from "./dashboard.routes";
import PropertyRouter from "./properties.routes";
import PerformanceController from "../controllers/performance.controller";
class TenantRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize, this.authenticateService.authorizeRole(userRoles.TENANT))
        this.router.use('/dashboard', TenantDashboardRouter)
        this.router.use('/bills', TenantBillRouter)
        this.router.get('/scores', PerformanceController.getTenantPerformance)
        this.router.use('/maintenances', MaintenanceRouter)
        this.router.use('/profile', ProfileRouter)
        this.router.use('/properties', PropertyRouter)
        this.router.get('/:tenantId', TenantController.getTenantById)
    }
}

export default new TenantRouter().router;