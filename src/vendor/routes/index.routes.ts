import { Router } from "express";
import { userRoles } from '@prisma/client';
import { Authorize } from "../../middlewares/authorize";
import EventRoutes from "./events";
import MaintenanceRoutes from "./maintenance";
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
        this.router.use("/events", EventRoutes)
        this.router.use("/maintenance", MaintenanceRoutes)
        
    }
}

export default new VendorRouter().router
