import { Router } from "express";
import StorageAnalyticsController from "../controllers/storageAnalytics.controller";
import { Authorize } from "../../middlewares/authorize";
import { userRoles } from "@prisma/client";

class StorageAnalyticsRouter {
    public router: Router;
    authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Apply authentication and landlord role authorization
        this.router.use(this.authenticateService.authorize);
        this.router.use(this.authenticateService.authorizeRole(userRoles.LANDLORD));

        // Storage analytics routes
        this.router.get('/analytics', StorageAnalyticsController.getStorageAnalytics);
    }
}

export default new StorageAnalyticsRouter().router;
