"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorize = void 0;
const secrets_1 = require("../secrets");
const Jtoken_1 = require("./Jtoken");
const user_services_1 = __importDefault(require("../services/user.services"));
class Authorize {
    constructor() {
        this.tokenService = new Jtoken_1.Jtoken(secrets_1.JWT_SECRET);
        this.authorize = this.authorize.bind(this);
    }
    /**
     * Middleware to authorize users based on JWT.
     * @param req - Express request object
     * @param res - Express response object
     * @param next - Express next function
     */
    authorize(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            let token = this.extractToken(req);
            if (!token) {
                return res.status(401).json({ message: "Not authorized, token missing" });
            }
            try {
                const decoded = yield this.tokenService.decodeToken(token);
                if (!decoded) {
                    return res.status(401).json({ message: "Invalid or expired token" });
                }
                const user = yield user_services_1.default.findAUserById(String(decoded.id));
                if (!user) {
                    return res.status(401).json({ message: "User not found" });
                }
                req.user = user;
                return next();
            }
            catch (error) {
                if (error.name === "TokenExpiredError") {
                    return this.handleTokenRefresh(req, res, next);
                }
                return res.status(401).json({ message: "Token verification failed" });
            }
        });
    }
    extractToken(req) {
        var _a;
        if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer ")) {
            return req.headers.authorization.split(" ")[1];
        }
        return undefined;
    }
    /**
     * Handles token refresh if access token is expired.
     * @param req - Express request object
     * @param res - Express response object
     * @param next - Express next function
     */
    handleTokenRefresh(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const refreshToken = req.headers["x-refresh-token"];
            if (!refreshToken) {
                return res.status(401).json({ message: "Refresh token required, set x-refresh-token" });
            }
            const newTokens = yield this.tokenService.verifyAndRefreshToken(refreshToken);
            if (!newTokens) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }
            // Attach new user data to request
            req.user = yield this.tokenService.decodeToken(newTokens.accessToken);
            // Send new tokens in response headers
            res.setHeader("x-access-token", newTokens.accessToken);
            res.setHeader("x-refresh-token", newTokens.refreshToken);
            return next();
        });
    }
    /**
     * Middleware to authorize users based on role.
     * @param role - Required user role
     */
    authorizeRole(role) {
        return (req, res, next) => {
            var _a;
            if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role.includes(role))
                return next();
            res.status(403).json({ message: `You are not authorized as a ${role}` });
        };
    }
    /**
     * Logs out a user by clearing authorization headers.
     * @param req - Express request object
     * @param res - Express response object
     */
    logoutUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            req.headers.authorization = "";
            return res.status(200).json({ message: "Logged out successfully" });
        });
    }
}
exports.Authorize = Authorize;
