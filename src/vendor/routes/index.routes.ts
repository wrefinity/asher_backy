import { Router } from "express";
import { userRoles } from '@prisma/client';
import { Authorize } from "../../middlewares/authorize";
import EventRoutes from "./events";
import MaintenanceRoutes from "./maintenance";
import servicesRoutes from "./services";
import vendorAnalyticsController from "../controllers/vendor.analytics.controller";
class VendorRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.use(this.authenticateService.authorizeRole(userRoles.VENDOR))
        // events modules under vendor
        this.router.use("/analytics", vendorAnalyticsController.getVendorOverview)
        this.router.use("/reports", vendorAnalyticsController.getVendorGraphs)
        this.router.use("/events", EventRoutes)
        this.router.use("/maintenance", MaintenanceRoutes)
        this.router.use("/services", servicesRoutes)
        
    }
}

export default new VendorRouter().router
