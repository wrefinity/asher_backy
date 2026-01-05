import { Router } from "express";
import AuthController from "../controllers/auth";
import RoleRouter from "./roles"
import { validateBody } from "../middlewares/validation";
import { ConfirmationSchema, LoginSchema, passwordResetSchema, RegisterSchema, RegisterVendorSchema, updatePasswordSchema } from "../validations/schemas/auth";
import { uploadToCloudinaryGeneric } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
import { Authorize } from "../middlewares/authorize";

class AuthRoutes {
    public router: Router;
    public authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use("/roles", RoleRouter);
        this.router.post("/login", validateBody(LoginSchema), AuthController.login.bind(AuthController));
        this.router.post("/logout", this.authenticateService.authorize, AuthController.logout.bind(AuthController));
        this.router.post("/send-token", AuthController.sendToken.bind(AuthController));
        this.router.post("/verify-otp/token", AuthController.genericConfirmation.bind(AuthController));
        this.router.post("/verify", validateBody(ConfirmationSchema), AuthController.confirmation.bind(AuthController));
        this.router.post("/reset-code", AuthController.sendPasswordResetCode.bind(AuthController));
        this.router.post("/refresh-token", AuthController.refreshToken.bind(AuthController));
        this.router.post("/register", validateBody(RegisterSchema), AuthController.register.bind(AuthController));
        this.router.post("/register-vendor", upload.array('files'), uploadToCloudinaryGeneric, validateBody(RegisterVendorSchema), AuthController.registerVendor.bind(AuthController));
        this.router.post("/reset-password", validateBody(passwordResetSchema), AuthController.passwordReset.bind(AuthController));
        this.router.post('/tenants/register', AuthController.registerTenant.bind(AuthController))
        this.router.post('/update-password', this.authenticateService.authorize, validateBody(updatePasswordSchema),  AuthController.updatePassword.bind(AuthController))
        this.router.post("/google-auth", AuthController.verifyGoogleToken.bind(AuthController))
    }
}


export default new AuthRoutes().router;

