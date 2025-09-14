// middleware/Authorize.ts
import { Response, NextFunction } from "express";
import { JWT_SECRET } from "../secrets";
import { CustomRequest, JWTPayload } from "../utils/types";
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

            // Build the user object with proper tenant context
            req.user = this.buildUserWithContext(user, decoded);
            return next();
        } catch (error) {
            console.log("=====token verificatio reason failure======")
            console.log(error)
            if (error.name === "TokenExpiredError") {
                return this.handleTokenRefresh(req, res, next);
            }
            return res.status(401).json({ message: "Token verification failed" });
        }
    }

    /**
     * Builds user object with proper tenant/landlord/vendor context
     */
    private buildUserWithContext(user: any, decoded: JWTPayload): JWTPayload {
        console.log("=====building user context======")
        console.log({ user, decoded })
        const baseUser = {
            id: user.id,
            role: user.role,
            email: user.email,
        };

        // If JWT has specific tenant info, use that (tenant-specific login)
        if (decoded.tenantId && decoded.tenantCode) {
            return {
                ...baseUser,
                tenantCode: decoded.tenantCode,
                tenantId: decoded.tenantId,
                tenant: { id: decoded.tenantId },
                // Clear other contexts when in tenant-specific mode
                landlords: undefined,
                vendors: undefined
            };
        }

        // If JWT has landlord info, use that
        if (decoded.landlords?.id) {
            return {
                ...baseUser,
                landlords: { id: decoded.landlords.id },
                // Clear other contexts
                tenant: undefined,
                tenantCode: undefined,
                tenantId: undefined,
                vendors: undefined
            };
        }

        // If JWT has vendor info, use that
        if (decoded.vendors?.id) {
            return {
                ...baseUser,
                vendors: { id: decoded.vendors.id },
                // Clear other contexts
                tenant: undefined,
                tenantCode: undefined,
                tenantId: undefined,
                landlords: undefined
            };
        }

        // Default: include all relationships from database
        return {
            ...baseUser,
            tenant: user.tenants.length > 0 ? { id: user.tenants[0].id } : undefined,
            tenantCode: user.tenants.length > 0 ? user.tenants[0].tenantCode : undefined,
            tenantId: user.tenants.length > 0 ? user.tenants[0].id : undefined,
            landlords: user.landlords.length > 0 ? { id: user.landlords[0].id } : undefined,
            vendors: user.vendors.length > 0 ? { id: user.vendors[0].id } : undefined
        };
    }

    private extractToken(req: CustomRequest): string | undefined {
        if (req.headers.authorization?.startsWith("Bearer ")) {
            return req.headers.authorization.split(" ")[1];
        }
        return undefined;
    }

    /**
     * Handles token refresh if access token is expired.
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

        // Get fresh user data with relationships
        const user = await UserService.findAUserById(newTokens.user.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // Build user with proper context - pass the user payload from refresh
        req.user = this.buildUserWithContext(user, newTokens.user);

        // Send new tokens in response headers
        res.setHeader("x-access-token", newTokens.accessToken);
        res.setHeader("x-refresh-token", newTokens.refreshToken);

        return next();
    }

    /**
     * Middleware to authorize users based on role.
     */
    authorizeRole(role: userRoles) {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (req.user?.role.includes(role)) return next();
            res.status(403).json({ message: `You are not authorized as a ${role}` });
        };
    }

    /**
     * Middleware to ensure user is operating in tenant context
     */
    requireTenantContext() {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (!req.user?.tenant?.id && !req.user?.tenantId) {
                return res.status(403).json({
                    message: "Tenant context required. Please log in as a specific tenant."
                });
            }
            next();
        };
    }

    /**
     * Middleware to ensure user is operating in landlord context
     */
    requireLandlordContext() {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (!req.user?.landlords?.id) {
                return res.status(403).json({
                    message: "Landlord context required."
                });
            }
            next();
        };
    }

    /**
     * Middleware to ensure user is operating in vendor context
     */
    requireVendorContext() {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (!req.user?.vendors?.id) {
                return res.status(403).json({
                    message: "Vendor context required."
                });
            }
            next();
        };
    }

    /**
     * Logs out a user by clearing authorization headers.
     */
    async logoutUser(req: CustomRequest, res: Response) {
        req.headers.authorization = "";
        return res.status(200).json({ message: "Logged out successfully" });
    }
}