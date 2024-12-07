"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../controllers/auth"));
const roles_1 = __importDefault(require("./roles"));
class AuthRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use("/roles", roles_1.default);
        this.router.post("/login", auth_1.default.login.bind(auth_1.default));
        this.router.post("/verify", auth_1.default.confirmation.bind(auth_1.default));
        this.router.post("/register", auth_1.default.register.bind(auth_1.default));
        this.router.post('/tenants/register', auth_1.default.registerTenant.bind(auth_1.default));
        this.router.post('/landlord/register', auth_1.default.createLandlord.bind(auth_1.default));
        // this.router.get("/google_url", AuthController.sendGoogleUrl.bind(AuthController))
        // this.router.get("/google/callback", AuthController.githubLogin.bind(AuthController))
    }
}
exports.default = new AuthRoutes().router;
