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
        this.router.get("/verify", AuthController.confirmation);
        this.router.get("/register", AuthController.register);
        this.router.get("/google_url", AuthController.sendGoogleUrl)
        this.router.get("/google/callback", AuthController.githubLogin)
    }
}

export default new AuthRoutes().router;
