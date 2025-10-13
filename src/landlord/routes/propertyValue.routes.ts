import { Router } from "express";
import PropertyValueController from "../controllers/propertyValue.controller";
import { Authorize } from "../../middlewares/authorize";
import { userRoles } from "@prisma/client";

class PropertyValueRouter {
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

        // Property value routes
        this.router.get('/analytics', PropertyValueController.getPropertyValueAnalytics);
        this.router.get('/:propertyId', PropertyValueController.getPropertyValueById);
    }
}

export default new PropertyValueRouter().router;
