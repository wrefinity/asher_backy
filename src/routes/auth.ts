import { Router } from "express";
import AuthController from "../controllers/auth";
import RoleRouter from "./roles"
class AuthRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use("/roles", RoleRouter);
        this.router.post("/login", AuthController.login.bind(AuthController));
        this.router.post("/verify", AuthController.confirmation.bind(AuthController));
        this.router.post("/register", AuthController.register.bind(AuthController));
        this.router.post('/tenants/register', AuthController.registerTenant.bind(AuthController))
        this.router.post('/landlord/register', AuthController.createLandlord.bind(AuthController))
        // this.router.get("/google_url", AuthController.sendGoogleUrl.bind(AuthController))
        // this.router.get("/google/callback", AuthController.githubLogin.bind(AuthController))
    }
}


export default new AuthRoutes().router;

