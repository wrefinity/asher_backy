import { Router } from "express";
import AuthRoute from "./auth";

class TenantRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/auth", AuthRoute);
    }
}

export default new TenantRoutes().router;
