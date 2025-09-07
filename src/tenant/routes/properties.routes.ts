import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import propertyController from "../controllers/properties.controller";
import { validateBody } from "../../middlewares/validation";

class PropertyRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/search", validateBody, propertyController.searchProperties);

    }
}

export default new PropertyRouter().router;