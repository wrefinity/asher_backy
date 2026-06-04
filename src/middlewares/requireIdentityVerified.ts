import { Response, NextFunction } from 'express';
import { userRoles } from '@prisma/client';
import { prismaClient } from '..';
import { getLandlordIdentityVerification } from '../services/landlordIdentity.service';
import { CustomRequest } from '../utils/types';
import { isIdentityVerificationEnabled } from '../config/featureFlags';

/**
 * Blocks leasing and application flows until landlord identity is VERIFIED.
 * Bulk tenant upload and direct enrolment remain available; application/leasing APIs do not.
 */
export async function requireLandlordIdentityVerified(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isIdentityVerificationEnabled()) {
      next();
      return;
    }

    if (!req.user?.id) {
      next();
      return;
    }

    const user = await prismaClient.users.findUnique({
      where: { id: req.user.id },
      select: {
        role: true,
        landlords: { select: { id: true } },
      },
    });

    if (!user?.role?.includes(userRoles.LANDLORD)) {
      next();
      return;
    }

    const identity = await getLandlordIdentityVerification(user.landlords?.id);

    if (identity.canUseLeasingFlows) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message:
        'Identity verification is required before using leasing or application flows. Upload your ID in onboarding or account settings.',
      code: 'IDENTITY_VERIFICATION_REQUIRED',
      data: { identityVerification: identity },
    });
  } catch (error) {
    next(error);
  }
}
