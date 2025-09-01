import { Router } from "express";
import ProfileController from "../controllers/profile";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import { tenantCreateSchema } from "../../webuser/schemas";

class Profile {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.get("/:tenantId", ProfileController.getProfileData);
        this.router.patch("/:tenantId", validateBody(tenantCreateSchema), ProfileController.updateTenantApplicationData);
    }
}

export default new Profile().router;