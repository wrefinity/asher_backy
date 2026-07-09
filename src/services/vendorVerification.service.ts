// Vendor onboarding verification (Part 1 of VENDOR_APP_FLOW_SPEC.md). Mirrors
// the existing landlordIdentity.service.ts pattern, adapted to the simpler
// PENDING/APPROVED/REJECTED status already modelled on `vendors` and the
// richer `vendorDocument` relation (vs. landlords' plain string-array field).
import { VendorVerificationStatus } from '@prisma/client';
import { prismaClient } from '..';
import NotificationService from './notification.service';
import { sendPreferenceAwareMail } from '../utils/sendPreferenceAwareMail';
import { NotificationCategory } from '@prisma/client';
import logger from '../utils/loggers';

export class VendorVerificationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'VendorVerificationError';
    this.statusCode = statusCode;
  }
}

export type PendingVendorVerification = {
  vendorId: string;
  userId: string;
  name: string;
  email: string;
  businessName: string | null;
  businessRegistrationNumber: string | null;
  documents: { id: string; type: string; url: string; createdAt: Date }[];
  submittedAt: Date;
};

export async function listPendingVendorVerifications(): Promise<
  PendingVendorVerification[]
> {
  const vendors = await prismaClient.vendors.findMany({
    where: { verificationStatus: VendorVerificationStatus.PENDING },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullname: true, firstName: true, lastName: true } },
        },
      },
      documents: { select: { id: true, type: true, url: true, createdAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return vendors
    .filter((vendor) => vendor.user)
    .map((vendor) => {
      const profile = vendor.user!.profile;
      const name =
        profile?.fullname ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
        vendor.user!.email.split('@')[0];

      return {
        vendorId: vendor.id,
        userId: vendor.user!.id,
        name,
        email: vendor.user!.email,
        businessName: vendor.businessName,
        businessRegistrationNumber: vendor.businessRegistrationNumber,
        documents: vendor.documents,
        submittedAt: vendor.updatedAt,
      };
    });
}

export async function approveVendorVerification(vendorId: string) {
  const vendor = await prismaClient.vendors.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new VendorVerificationError('Vendor not found', 404);
  if (vendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new VendorVerificationError('Only pending vendors can be approved');
  }

  const updated = await prismaClient.vendors.update({
    where: { id: vendorId },
    data: { verificationStatus: VendorVerificationStatus.APPROVED },
  });

  await notifyVendorVerificationDecision(vendorId, 'APPROVED');

  return updated;
}

/**
 * "Restart onboarding from scratch" (Part 1 of VENDOR_APP_FLOW_SPEC.md) for a
 * REJECTED vendor. The account/email already exists, so this replaces the
 * previously-submitted documents and resets status back to PENDING rather
 * than trying to register a brand-new account with the same email (which
 * would fail on the unique email constraint).
 */
export async function resubmitVendorVerification(
  vendorId: string,
  documents: { url: string; type: string }[]
) {
  const vendor = await prismaClient.vendors.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new VendorVerificationError('Vendor not found', 404);
  if (vendor.verificationStatus !== VendorVerificationStatus.REJECTED) {
    throw new VendorVerificationError('Only rejected vendors can resubmit for review');
  }
  if (documents.length === 0) {
    throw new VendorVerificationError('At least one document is required to resubmit');
  }

  return prismaClient.$transaction(async (tx) => {
    await tx.vendorDocument.deleteMany({ where: { vendorId } });
    await tx.vendorDocument.createMany({
      data: documents.map((doc) => ({ url: doc.url, type: doc.type, vendorId })),
    });
    return tx.vendors.update({
      where: { id: vendorId },
      data: { verificationStatus: VendorVerificationStatus.PENDING },
    });
  });
}

export async function rejectVendorVerification(vendorId: string) {
  const vendor = await prismaClient.vendors.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new VendorVerificationError('Vendor not found', 404);
  if (vendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new VendorVerificationError('Only pending vendors can be rejected');
  }

  const updated = await prismaClient.vendors.update({
    where: { id: vendorId },
    data: { verificationStatus: VendorVerificationStatus.REJECTED },
  });

  await notifyVendorVerificationDecision(vendorId, 'REJECTED');

  return updated;
}

async function notifyVendorVerificationDecision(
  vendorId: string,
  decision: 'APPROVED' | 'REJECTED'
): Promise<void> {
  try {
    const vendor = await prismaClient.vendors.findUnique({
      where: { id: vendorId },
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

    const user = vendor?.user;
    if (!user) return;

    const name = user.profile?.fullname || user.profile?.firstName || 'there';
    const isApproved = decision === 'APPROVED';
    const title = isApproved
      ? 'Your vendor verification is approved'
      : 'Vendor verification not approved';
    const message = isApproved
      ? 'You can now continue setting up your Asher Vendor account.'
      : 'Your submitted documents were not approved. Please restart onboarding with clear documents.';

    await NotificationService.createNotification(
      { destId: user.id, title, message },
      'COMMUNICATION'
    );

    const html = isApproved
      ? `<p>Hello ${name},</p><p>Your vendor verification is approved - you can now continue in the Asher Vendor app.</p>`
      : `<p>Hello ${name},</p><p>Your vendor verification was not approved. Please sign in and restart onboarding with clear, valid documents.</p>`;

    await sendPreferenceAwareMail({
      userId: user.id,
      category: NotificationCategory.COMMUNICATION,
      notificationType: isApproved ? 'vendor_verification_approved' : 'vendor_verification_rejected',
      to: user.email,
      subject: title,
      html,
    }).catch((err) => {
      logger.warn('Vendor verification decision email failed', err);
    });
  } catch (error) {
    logger.error('Failed to notify vendor of verification decision', error);
  }
}
