import { Router } from "express";
import AuthController from "../controllers/auth";
import RoleRouter from "./roles"
import { validateBody } from "../middlewares/validation";
import { ConfirmationSchema, LoginSchema, RegisterSchema, RegisterVendorSchema } from "../validations/schemas/auth";
import { uploadToCloudinaryGeneric } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
class AuthRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use("/roles", RoleRouter);
        this.router.post("/login", validateBody(LoginSchema), AuthController.login.bind(AuthController));
        this.router.post("/send-token", AuthController.sendToken.bind(AuthController));
        this.router.post("/verify-otp/token", AuthController.genericConfirmation.bind(AuthController));
        this.router.post("/verify", validateBody(ConfirmationSchema), AuthController.confirmation.bind(AuthController));
        this.router.post("/reset-code", AuthController.sendPasswordResetCode.bind(AuthController));
        this.router.post("/refresh-token", AuthController.refreshToken.bind(AuthController));
        this.router.post("/register", validateBody(RegisterSchema), AuthController.register.bind(AuthController));
        this.router.post("/register-vendor", upload.array('files'), uploadToCloudinaryGeneric, validateBody(RegisterVendorSchema), AuthController.registerVendor.bind(AuthController));
        this.router.post("/reset-password", AuthController.passwordReset.bind(AuthController));
        this.router.post('/tenants/register', AuthController.registerTenant.bind(AuthController))
        // this.router.post('/landlord/register', AuthController.createLandlord.bind(AuthController))
        // this.router.get("/google_url", AuthController.sendGoogleUrl.bind(AuthController))
        // this.router.get("/google/callback", AuthController.githubLogin.bind(AuthController))
    }
}


export default new AuthRoutes().router;

