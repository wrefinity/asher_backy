import { Response, NextFunction } from "express";
import { userRoles } from "@prisma/client";
import { CustomRequest } from "../utils/types";
import { normalizeUserRoles } from "./requireWebUserPortalRole";

const MESSAGING_ROLES: userRoles[] = [
  userRoles.WEBUSER,
  userRoles.TENANT,
  userRoles.LANDLORD,
  userRoles.ADMIN,
];

export function canAccessMessaging(roles: userRoles[]): boolean {
  return roles.some((r) => MESSAGING_ROLES.includes(r));
}

/**
 * Landlord, tenant, web user, and admin may use in-app email and chat.
 */
export function requireMessagingAccess() {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const roles = normalizeUserRoles(req.user?.role);

    if (!canAccessMessaging(roles)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to use messaging.",
        code: "MESSAGING_ACCESS_DENIED",
      });
    }

    return next();
  };
}
