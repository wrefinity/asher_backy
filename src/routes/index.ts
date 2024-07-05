import { Router } from "express";
import AuthRoute from "./auth";
import ApplicantRoute from "./applicant";

class IndexRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/auth", AuthRoute);
        this.router.get("/auth", AuthRoute);
    }
}

export default new IndexRoutes().router;
