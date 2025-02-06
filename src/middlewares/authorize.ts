import { Response, NextFunction } from "express";
import { JWT_SECRET } from "../secrets";
import { CustomRequest } from "../utils/types";
import { Jtoken } from "./Jtoken";
import UserService from "../services/user.services";
import { userRoles } from "@prisma/client";

export class Authorize {
    private tokenService: Jtoken;

    constructor() {
        this.tokenService = new Jtoken(JWT_SECRET);
        this.authorize = this.authorize.bind(this);
    }

    /**
     * Middleware to authorize users based on JWT.
     * @param req - Express request object
     * @param res - Express response object
     * @param next - Express next function
     */
    async authorize(req: CustomRequest, res: Response, next: NextFunction) {
        let token = this.extractToken(req);

        if (!token) {
            return res.status(401).json({ message: "Not authorized, token missing" });
        }

        try {
            const decoded = await this.tokenService.decodeToken(token);
            if (!decoded) {
                return res.status(401).json({ message: "Invalid or expired token" });
            }

            const user = await UserService.findAUserById(String(decoded.id));
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            req.user = user;
            return next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return this.handleTokenRefresh(req, res, next);
            }
            return res.status(401).json({ message: "Token verification failed" });
        }
    }

    private extractToken(req: CustomRequest): string | undefined {
        if (req.headers.authorization?.startsWith("Bearer ")) {
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
    private async handleTokenRefresh(req: CustomRequest, res: Response, next: NextFunction) {
        const refreshToken = req.headers["x-refresh-token"] as string;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token required, set x-refresh-token" });
        }

        const newTokens = await this.tokenService.verifyAndRefreshToken(refreshToken);
        if (!newTokens) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Attach new user data to request
        const decoded = await this.tokenService.decodeToken(newTokens.accessToken);

        const user = await UserService.findAUserById(String(decoded.id));
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user;
        // Send new tokens in response headers
        res.setHeader("x-access-token", newTokens.accessToken);
        res.setHeader("x-refresh-token", newTokens.refreshToken);

        return next();
    }

    /**
     * Middleware to authorize users based on role.
     * @param role - Required user role
     */
    authorizeRole(role: userRoles) {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (req.user?.role.includes(role)) return next();
            res.status(403).json({ message: `You are not authorized as a ${role}` });
        };
    }

    /**
     * Logs out a user by clearing authorization headers.
     * @param req - Express request object
     * @param res - Express response object
     */
    async logoutUser(req: CustomRequest, res: Response) {
        req.headers.authorization = "";
        return res.status(200).json({ message: "Logged out successfully" });
    }
}
