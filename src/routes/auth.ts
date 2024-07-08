import { Router } from "express";
import AuthController from "../controllers/auth";

class AuthRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post("/login", AuthController.login.bind(AuthController));
        this.router.post("/verify", AuthController.confirmation.bind(AuthController));
        this.router.post("/register", AuthController.register.bind(AuthController));
        this.router.get("/google_url", AuthController.sendGoogleUrl.bind(AuthController))
        this.router.get("/google/callback", AuthController.githubLogin.bind(AuthController))
    }
}

export default new AuthRoutes().router;
