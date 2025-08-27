import { Router } from "express";
import ProfileController from "../controllers/profile";
import { Authorize } from "../../middlewares/authorize";

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
    }
}

export default new Profile().router;