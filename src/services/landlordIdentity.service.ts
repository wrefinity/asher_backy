import { LandlordIdentityVerificationStatus } from '@prisma/client';
import { prismaClient } from '..';
import NotificationService from './notification.service';
import { sendPreferenceAwareMail } from '../utils/sendPreferenceAwareMail';
import { NotificationCategory } from '@prisma/client';
import logger from '../utils/loggers';
import { isIdentityVerificationEnabled } from '../config/featureFlags';

export type IdentityStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'SKIPPED';

export class IdentityVerificationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'IdentityVerificationError';
    this.statusCode = statusCode;
  }
}

/** Runtime-safe enum values when Prisma client is stale or migration pending */
export const IdentityStatusEnum: Record<
  IdentityStatus,
  LandlordIdentityVerificationStatus | IdentityStatus
> = {
  NONE:
    LandlordIdentityVerificationStatus?.NONE ??
    ('NONE' as LandlordIdentityVerificationStatus),
  PENDING:
    LandlordIdentityVerificationStatus?.PENDING ??
    ('PENDING' as LandlordIdentityVerificationStatus),
  VERIFIED:
    LandlordIdentityVerificationStatus?.VERIFIED ??
    ('VERIFIED' as LandlordIdentityVerificationStatus),
  SKIPPED:
    LandlordIdentityVerificationStatus?.SKIPPED ??
    ('SKIPPED' as LandlordIdentityVerificationStatus),
};

export type IdentityVerificationState = {
  status: IdentityStatus;
  documentUrls: string[];
  verifiedAt: Date | null;
  skippedAt: Date | null;
  submittedAt: Date | null;
  rejectedAt: Date | null;
  canUseLeasingFlows: boolean;
  isCompleteForOnboarding: boolean;
};

function normalizeStatus(raw: unknown): IdentityStatus {
  if (
    raw === 'NONE' ||
    raw === 'PENDING' ||
    raw === 'VERIFIED' ||
    raw === 'SKIPPED'
  ) {
    return raw;
  }
  return 'NONE';
}

function bypassedIdentityState(): IdentityVerificationState {
  return {
    status: 'SKIPPED',
    documentUrls: [],
    verifiedAt: null,
    skippedAt: new Date(),
    submittedAt: null,
    rejectedAt: null,
    canUseLeasingFlows: true,
    isCompleteForOnboarding: true,
  };
}

export async function getLandlordIdentityVerification(
  landlordId: string | undefined | null
): Promise<IdentityVerificationState> {
  if (!isIdentityVerificationEnabled()) {
    return bypassedIdentityState();
  }

  const empty: IdentityVerificationState = {
    status: 'NONE',
    documentUrls: [],
    verifiedAt: null,
    skippedAt: null,
    submittedAt: null,
    rejectedAt: null,
    canUseLeasingFlows: false,
    isCompleteForOnboarding: false,
  };

  if (!landlordId) return empty;

  try {
    const landlord = await prismaClient.landlords.findUnique({
      where: { id: landlordId },
      select: {
        identityVerificationStatus: true,
        identityDocumentUrls: true,
        identityVerifiedAt: true,
        identityVerificationSkippedAt: true,
        identitySubmittedAt: true,
        identityRejectedAt: true,
      },
    });

    if (!landlord) return empty;

    const status = normalizeStatus(landlord.identityVerificationStatus);

    return {
      status,
      documentUrls: landlord.identityDocumentUrls ?? [],
      verifiedAt: landlord.identityVerifiedAt,
      skippedAt: landlord.identityVerificationSkippedAt,
      submittedAt: landlord.identitySubmittedAt ?? null,
      rejectedAt: landlord.identityRejectedAt ?? null,
      canUseLeasingFlows: status === 'VERIFIED',
      isCompleteForOnboarding:
        status === 'PENDING' ||
        status === 'VERIFIED' ||
        status === 'SKIPPED',
    };
  } catch {
    return empty;
  }
}

export async function submitLandlordIdentityDocuments(
  landlordId: string,
  documentUrls: string[]
): Promise<IdentityVerificationState> {
  const current = await getLandlordIdentityVerification(landlordId);

  if (current.status === 'VERIFIED') {
    throw new IdentityVerificationError('Identity is already verified');
  }
  if (current.status === 'PENDING') {
    throw new IdentityVerificationError(
      'Identity verification is already pending admin review'
    );
  }

  await prismaClient.landlords.update({
    where: { id: landlordId },
    data: {
      identityDocumentUrls: documentUrls,
      identityVerificationStatus: IdentityStatusEnum.PENDING,
      identityVerifiedAt: null,
      identityVerificationSkippedAt: null,
      identitySubmittedAt: new Date(),
      identityRejectedAt: null,
    },
  });

  return getLandlordIdentityVerification(landlordId);
}

export async function skipLandlordIdentityVerification(
  landlordId: string
): Promise<IdentityVerificationState> {
  const current = await getLandlordIdentityVerification(landlordId);

  if (current.status === 'VERIFIED') {
    throw new IdentityVerificationError('Identity is already verified');
  }
  if (current.status === 'PENDING') {
    throw new IdentityVerificationError(
      'Cannot skip while verification is pending admin review'
    );
  }

  await prismaClient.landlords.update({
    where: { id: landlordId },
    data: {
      identityVerificationStatus: IdentityStatusEnum.SKIPPED,
      identityVerificationSkippedAt: new Date(),
    },
  });

  return getLandlordIdentityVerification(landlordId);
}

export async function approveLandlordIdentityVerification(
  landlordId: string
): Promise<IdentityVerificationState> {
  const current = await getLandlordIdentityVerification(landlordId);

  if (current.status !== 'PENDING') {
    throw new IdentityVerificationError(
      'Only pending identity submissions can be approved'
    );
  }

  await prismaClient.landlords.update({
    where: { id: landlordId },
    data: {
      identityVerificationStatus: IdentityStatusEnum.VERIFIED,
      identityVerifiedAt: new Date(),
      identityVerificationSkippedAt: null,
      identityRejectedAt: null,
    },
  });

  return getLandlordIdentityVerification(landlordId);
}

export async function rejectLandlordIdentityVerification(
  landlordId: string
): Promise<IdentityVerificationState> {
  const current = await getLandlordIdentityVerification(landlordId);

  if (current.status !== 'PENDING') {
    throw new IdentityVerificationError(
      'Only pending identity submissions can be rejected'
    );
  }

  await prismaClient.landlords.update({
    where: { id: landlordId },
    data: {
      identityVerificationStatus: IdentityStatusEnum.NONE,
      identityDocumentUrls: [],
      identityVerifiedAt: null,
      identitySubmittedAt: null,
      identityRejectedAt: new Date(),
    },
  });

  await notifyLandlordIdentityRejected(landlordId);

  return getLandlordIdentityVerification(landlordId);
}

async function notifyLandlordIdentityRejected(landlordId: string): Promise<void> {
  try {
    const landlord = await prismaClient.landlords.findUnique({
      where: { id: landlordId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, fullname: true } },
          },
        },
      },
    });

    const user = landlord?.user;
    if (!user) return;

    const name = user.profile?.fullname || user.profile?.firstName || 'there';
    const title = 'Identity verification not approved';
    const message =
      'Your identity documents were not approved. Please upload a clear government-issued ID from Account setup.';

    await NotificationService.createNotification(
      {
        destId: user.id,
        title,
        message,
      },
      'COMMUNICATION'
    );

    const html = `
      <p>Hello ${name},</p>
      <p>Your identity verification submission was not approved.</p>
      <p>Please sign in to Asher, open <strong>Account setup</strong>, and upload a clear government-issued ID.</p>
      <p>Leasing and application features remain locked until your identity is verified.</p>
    `;

    await sendPreferenceAwareMail({
      userId: user.id,
      category: NotificationCategory.COMMUNICATION,
      notificationType: 'identity_rejected',
      to: user.email,
      subject: title,
      html,
    }).catch(err => {
      logger.warn('Identity rejection email failed', err);
    });
  } catch (error) {
    logger.error('Failed to notify landlord of identity rejection', error);
  }
}

export type PendingIdentityVerification = {
  landlordId: string;
  userId: string;
  name: string;
  email: string;
  businessName: string | null;
  documentUrls: string[];
  submittedAt: Date | null;
};

export async function listPendingIdentityVerifications(): Promise<
  PendingIdentityVerification[]
> {
  try {
    const landlords = await prismaClient.landlords.findMany({
      where: {
        isDeleted: false,
        identityVerificationStatus: IdentityStatusEnum.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullname: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { identitySubmittedAt: 'desc' },
    });

    return landlords.map((landlord) => {
      const profile = landlord.user.profile;
      const name =
        profile?.fullname ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
        landlord.user.email.split('@')[0];

      return {
        landlordId: landlord.id,
        userId: landlord.user.id,
        name,
        email: landlord.user.email,
        businessName: landlord.businessName,
        documentUrls: landlord.identityDocumentUrls ?? [],
        submittedAt: landlord.identitySubmittedAt ?? null,
      };
    });
  } catch {
    return [];
  }
}
