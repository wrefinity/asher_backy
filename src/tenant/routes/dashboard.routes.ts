import { Router } from "express";
import dashboardController from "../../controllers/dashboard.controller";
import { Authorize } from "../../middlewares/authorize";

class Dashboard {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        //tenant dashboard
        this.router.get("/", dashboardController.getDashboardData);

    }
}

export default new Dashboard().router;