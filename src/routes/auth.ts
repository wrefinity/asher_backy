import { Router } from "express";
import AuthController from "../controllers/auth";

class AuthRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/login", AuthController.login);
    }
}

export default new AuthRoutes().router;
