import { Response, NextFunction } from 'express';
import { CustomRequest } from '../utils/types';
import { requireLandlordIdentityVerified } from './requireIdentityVerified';
import { isIdentityVerificationEnabled } from '../config/featureFlags';

/** Landlord sub-routes under `/api/landlord/*` that require verified identity. */
export const LANDLORD_LEASING_IDENTITY_PATHS: RegExp[] = [
  /^\/application(?:\/|$)/,
  /^\/tenants\/create-tenant-application-info\//,
];

export function isLandlordLeasingIdentityPath(baseUrl: string, path: string): boolean {
  const combined = `${baseUrl}${path}`.replace(/\/+/g, '/');
  return LANDLORD_LEASING_IDENTITY_PATHS.some((pattern) => pattern.test(combined));
}

export async function requireLandlordLeasingIdentityIfNeeded(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isIdentityVerificationEnabled()) {
    next();
    return;
  }

  const base = req.baseUrl || '';
  const path = req.path || '';
  if (!isLandlordLeasingIdentityPath(base, path)) {
    next();
    return;
  }
  return requireLandlordIdentityVerified(req, res, next);
}
