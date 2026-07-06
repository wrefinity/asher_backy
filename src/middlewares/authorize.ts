// middleware/Authorize.ts
import { Response, NextFunction } from "express";
import { JWT_SECRET } from "../secrets";
import { CustomRequest, JWTPayload } from "../utils/types";
import { Jtoken } from "./Jtoken";
import UserService from "../services/user.services";
import { userRoles } from "@prisma/client";
import { requireWebUserPortalRole as requireWebUserPortalRoleMiddleware } from "./requireWebUserPortalRole";
import LoginSessionService from "../services/loginSession.service";
import { prismaClient } from "..";

export class Authorize {
    private tokenService: Jtoken;

    constructor() {
        this.tokenService = new Jtoken(JWT_SECRET);
        this.authorize = this.authorize.bind(this);
        this.optionalAuthorize = this.optionalAuthorize.bind(this);
    }

    /** Backfill session row for tokens issued before login-session tracking shipped. */
    private backfillLoginSession(req: CustomRequest) {
        void LoginSessionService.ensureSessionFromRequest(req, {
            touchActivity: true,
        }).catch(() => undefined);
    }

    /**
     * Optional auth: attaches req.user when a valid Bearer token is present;
     * continues as guest when token is missing or invalid (for public routes
     * that need engagement-aware behaviour for logged-in users).
     */
    async optionalAuthorize(req: CustomRequest, res: Response, next: NextFunction) {
        const token = this.extractToken(req);
        if (!token) {
            return next();
        }

        try {
            const decoded = await this.tokenService.decodeToken(token);
            if (!decoded) {
                return next();
            }

            const user = await UserService.findAUserById(String(decoded.id));
            if (!user) {
                return next();
            }

            req.user = this.buildUserWithContext(user, decoded);
        } catch {
            // Ignore invalid/expired tokens — treat as guest
        }

        return next();
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

            let user;
            try {
                user = await UserService.findAUserById(String(decoded.id));
            } catch (lookupError) {
                console.error("Auth user lookup failed:", lookupError);
                return res.status(401).json({ message: "User not found" });
            }

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // Build the user object with proper tenant context
            req.user = this.buildUserWithContext(user, decoded);
            this.backfillLoginSession(req);
            return next();
        } catch (error: any) {
            if (error?.name === "TokenExpiredError") {
                return this.handleTokenRefresh(req, res, next);
            }
            if (error?.name === "JsonWebTokenError") {
                return res.status(401).json({ message: "Invalid or expired token" });
            }
            console.error("Auth middleware error:", error);
            return res.status(500).json({ message: "Authentication service temporarily unavailable" });
        }
    }

    /**
     * Builds user object with proper tenant/landlord/vendor context
     */
    /**
     * Builds user object with proper tenant/landlord/vendor context
     */
    private buildUserWithContext(user: any, decoded: JWTPayload): JWTPayload {
        console.log({ user, decoded });

        const baseUser = {
            id: user.id,
            role: Array.isArray(user.role) ? user.role : String(user.role).split(","),
            email: user.email,
        };

        // Tenant-specific context (from JWT)

        // **FIX: Check for tenant context from JWT FIRST**
        if (decoded.tenantId && decoded.tenantCode) {
            console.log("Tenant context from JWT:", {
                tenantId: decoded.tenantId,
                tenantCode: decoded.tenantCode
            });

            return {
                ...baseUser,
                tenantCode: decoded.tenantCode,
                tenantId: decoded.tenantId,
                tenant: { id: decoded.tenantId },
                landlords: undefined,
                vendors: undefined,
            };
        }

        // **FIX: Check if user has tenants array and find matching tenant**
        if (Array.isArray(user.tenants) && user.tenants.length > 0) {
            let selectedTenant = null;

            // Try to find tenant by tenantCode from JWT
            if (decoded.tenantCode) {
                selectedTenant = user.tenants.find(
                    (t: any) => t.tenantCode === decoded.tenantCode
                );
                console.log("Found tenant by tenantCode:", selectedTenant);
            }

            // If not found, use the first tenant
            if (!selectedTenant) {
                selectedTenant = user.tenants[0];
                console.log("Using first tenant:", selectedTenant);
            }

            if (selectedTenant) {
                return {
                    ...baseUser,
                    tenant: { id: selectedTenant.id },
                    tenantCode: selectedTenant.tenantCode,
                    tenantId: selectedTenant.id,
                    landlords: user.landlords ? { id: user.landlords.id } : undefined,
                    vendors: user.vendors ? { id: user.vendors.id } : undefined,
                };
            }
        }


        //  Landlord-specific context (from JWT)
        if (decoded.landlords?.id) {
            return {
                ...baseUser,
                landlords: { id: decoded.landlords.id },
                tenant: undefined,
                tenantCode: undefined,
                tenantId: undefined,
                vendors: undefined,
            };
        }

        // Vendor-specific context (from JWT)
        if (decoded.vendors?.id) {
            return {
                ...baseUser,
                vendors: { id: decoded.vendors.id },
                tenant: undefined,
                tenantCode: undefined,
                tenantId: undefined,
                landlords: undefined,
            };
        }

        // Special case: WEBUSER → no tenant/landlord/vendor relationships
        if (baseUser.role.includes("WEBUSER")) {
            return {
                ...baseUser,
                tenant: undefined,
                tenantCode: undefined,
                tenantId: undefined,
                landlords: undefined,
                vendors: undefined,
            };
        }

        // Default: select tenant by decoded tenantCode, else fallback to first
        let selectedTenant = undefined;
        if (Array.isArray(user.tenants) && user.tenants.length > 0) {
            if (decoded.tenantCode) {
                selectedTenant = user.tenants.find(
                    (t: any) => t.tenantCode === decoded.tenantCode
                );
            }
            if (!selectedTenant) {
                selectedTenant = user.tenants[0];
            }
        }

        return {
            ...baseUser,
            tenant: selectedTenant ? { id: selectedTenant.id } : undefined,
            tenantCode: selectedTenant?.tenantCode,
            tenantId: selectedTenant?.id,
            landlords: user.landlords ? { id: user.landlords.id } : undefined,
            vendors: user.vendors ? { id: user.vendors.id } : undefined,
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

        req.headers.authorization = `Bearer ${newTokens.accessToken}`;
        this.backfillLoginSession(req);

        return next();
    }

    /**
     * Blocks LANDLORD-only / VENDOR-only tokens from tenant portal (AsherWebUser) APIs.
     * Must run after authorize().
     */
    requireWebUserPortalRole() {
        return requireWebUserPortalRoleMiddleware();
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

    authorizeAnyRole(...roles: userRoles[]) {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (roles.some((role) => req.user?.role.includes(role))) return next();
            res.status(403).json({ message: "You are not authorized for this action" });
        };
    }

    /**
     * Middleware to ensure user is operating in tenant context
     */
    requireTenantContext() {
        return async (req: CustomRequest, res: Response, next: NextFunction) => {
            const tenantId = req.user?.tenant?.id || req.user?.tenantId;
            if (!tenantId) {
                return res.status(403).json({
                    message: "Tenant context required. Please log in as a specific tenant."
                });
            }

            const tenant = await prismaClient.tenants.findUnique({
                where: { id: tenantId },
                select: {
                    isDeleted: true,
                    isAppAccessSuspended: true,
                },
            });

            if (!tenant || tenant.isDeleted) {
                return res.status(403).json({
                    message: "This tenant account is no longer active. Please contact your landlord."
                });
            }

            if (tenant.isAppAccessSuspended) {
                return res.status(403).json({
                    message: "Your access to the tenant app has been suspended. Please contact your landlord."
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