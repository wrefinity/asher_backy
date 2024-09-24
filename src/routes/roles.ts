import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import RolesController from "../controllers/roles.controller";

class RolesRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        // Assign roles to a user
        this.router.post("/assign-roles", RolesController.assignRoles);
        // Get roles of a specific user
        this.router.get("/roles/:userId", RolesController.getUserRoles);
        // Remove roles from a user
        this.router.post("/remove-roles", RolesController.removeRoles);
    }
}

export default new RolesRouter().router