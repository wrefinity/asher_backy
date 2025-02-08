import { Router } from "express";
import { userRoles } from "@prisma/client";
import { Authorize } from "../../middlewares/authorize";
import TenantController from "../controllers/tenant.controller";
import TenantBillRouter from "./tenant-bills.routes"
import MaintenanceRouter from "./maintenance.routes"
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
        this.router.use(this.authenticateService.authorize, this.authenticateService.authorizeRole(userRoles.TENANT))
        this.router.get('/:tenantId', TenantController.getTenantById)
        this.router.use('/dashboard', TenantDashboardRouter)
        this.router.use('/bills', TenantBillRouter)
        this.router.use('/maintenances', MaintenanceRouter)
    }
}

export default new TenantRouter().router;