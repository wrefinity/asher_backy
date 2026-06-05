import { Response, NextFunction } from "express";
import { userRoles } from "@prisma/client";
import { CustomRequest } from "../utils/types";

const WEB_USER_PORTAL_ROLES: userRoles[] = [userRoles.WEBUSER, userRoles.TENANT];

export function normalizeUserRoles(role: unknown): userRoles[] {
  if (!role) return [];
  if (Array.isArray(role)) return role as userRoles[];
  if (typeof role === "string") {
    return role.split(",").map((r) => r.trim()) as userRoles[];
  }
  return [];
}

export function canAccessWebUserPortal(roles: userRoles[]): boolean {
  return roles.some((r) => WEB_USER_PORTAL_ROLES.includes(r));
}

function buildForbiddenMessage(roles: userRoles[]): string {
  const hasLandlord = roles.includes(userRoles.LANDLORD);
  const hasVendor = roles.includes(userRoles.VENDOR);

  if (hasLandlord && !canAccessWebUserPortal(roles)) {
    return "Landlord accounts cannot access the tenant portal API. Use the landlord API instead.";
  }

  if (hasVendor && !canAccessWebUserPortal(roles)) {
    return "Vendor accounts cannot access the tenant portal API.";
  }

  return "You are not authorized to access the tenant portal API.";
}

/**
 * Rejects LANDLORD-only and VENDOR-only tokens on AsherWebUser (tenant portal) routes.
 * Allows WEBUSER and TENANT roles (including users with multiple roles when admin-assigned).
 */
export function requireWebUserPortalRole() {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const roles = normalizeUserRoles(req.user?.role);

    if (!canAccessWebUserPortal(roles)) {
      return res.status(403).json({
        success: false,
        message: buildForbiddenMessage(roles),
        code: "TENANT_PORTAL_ACCESS_DENIED",
      });
    }

    return next();
  };
}
