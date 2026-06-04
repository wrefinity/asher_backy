import { Response, NextFunction } from 'express';
import { userRoles } from '@prisma/client';
import { prismaClient } from '..';
import PreferencesService from '../services/preferences.service';
import { CustomRequest } from '../utils/types';
import { isLandlordOnboardingAllowedPath } from '../utils/onboarding.util';

/**
 * Blocks landlord API routes until required onboarding steps are complete.
 * Whitelisted paths remain available for setup flows (properties, bills, etc.).
 */
export async function requireLandlordOnboardingComplete(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      next();
      return;
    }

    const user = await prismaClient.users.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user?.role?.includes(userRoles.LANDLORD)) {
      next();
      return;
    }

    if (isLandlordOnboardingAllowedPath(req.path)) {
      next();
      return;
    }

    const onboarding = await PreferencesService.getOnboardingStatus(req.user.id);

    if (onboarding.canAccessApp) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Complete required onboarding steps to access this resource.',
      code: 'ONBOARDING_INCOMPLETE',
      data: onboarding,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Blocks all landlord routes (no whitelist) until onboarding is complete.
 * Use on wallet, transactions, and other non-setup APIs.
 */
export async function requireLandlordAppAccess(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      next();
      return;
    }

    const user = await prismaClient.users.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user?.role?.includes(userRoles.LANDLORD)) {
      next();
      return;
    }

    const onboarding = await PreferencesService.getOnboardingStatus(req.user.id);

    if (onboarding.canAccessApp) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Complete required onboarding steps to access this resource.',
      code: 'ONBOARDING_INCOMPLETE',
      data: onboarding,
    });
  } catch (error) {
    next(error);
  }
}
