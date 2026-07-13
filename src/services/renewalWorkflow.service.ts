import { prismaClient } from '..';
import { serverInstance } from '../index';
import { ApiError } from '../utils/ApiError';
import { resolveEffectiveRenewalTerms } from '../utils/leaseRenewalHelpers';
import {
  createRenewalAgreementDocument,
  type RenewalAgreementResult,
} from './renewalAgreement.service';
import {
  buildRenewalRentBillDescription,
  formatRenewalEffectiveDate,
  isRenewalRentEffectiveOnOrBefore,
  parseRenewalTermEndDate,
  parseRenewalTermStartDate,
  readPendingLeaseUpdate,
  type PendingLeaseUpdate,
} from '../utils/renewalEffectiveDate';

export type RenewalWorkflowPhase =
  | 'negotiating'
  | 'view_response'
  | 'send_agreement'
  | 'awaiting_tenant_sign'
  | 'counter_sign'
  | 'completed'
  | 'rejected'
  | 'expired';

export type RenewalAgreementState = {
  agreementDocumentId: string;
  applicationId: string;
  signedByTenantAt: Date | null;
  signedByLandlordAt: Date | null;
  renewalFinalized: boolean;
};

export type RenewalWorkflowState = {
  workflowPhase: RenewalWorkflowPhase;
  agreement?: RenewalAgreementState | null;
};

type AgreementRow = {
  id: string;
  applicationId: string;
  signedByTenantAt: Date | null;
  signedByLandlordAt: Date | null;
  metadata: unknown;
  createdAt: Date;
};

function readRenewalProposalId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const proposalId = (metadata as { renewalProposalId?: unknown }).renewalProposalId;
  if (typeof proposalId === 'string' && proposalId.length > 0) return proposalId;
  if (typeof proposalId === 'number') return String(proposalId);
  return undefined;
}

async function resolveRenewalProposalIdForAgreement(agreement: {
  applicationId: string;
  createdAt: Date;
}): Promise<string | undefined> {
  const tenant = await prismaClient.tenants.findFirst({
    where: { applicationId: agreement.applicationId },
    select: { id: true },
  });
  if (!tenant) return undefined;

  const proposals = await prismaClient.leaseRenewal.findMany({
    where: {
      tenantId: tenant.id,
      status: 'ACCEPTED',
    },
    orderBy: [{ respondedAt: 'desc' }, { createdAt: 'desc' }],
  });

  for (const proposal of proposals) {
    const anchor = proposal.respondedAt ?? proposal.createdAt;
    if (anchor && agreement.createdAt >= anchor) {
      return proposal.id;
    }
  }

  return proposals[0]?.id;
}

function isRenewalFinalized(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return Boolean((metadata as { renewalFinalized?: unknown }).renewalFinalized);
}

export function resolveRenewalWorkflowPhase(
  status: string,
  agreement?: RenewalAgreementState | null
): RenewalWorkflowPhase {
  if (status === 'REJECTED') return 'rejected';
  if (status === 'EXPIRED') return 'expired';
  if (['PENDING', 'COUNTER_OFFER'].includes(status)) return 'negotiating';

  if (status !== 'ACCEPTED') return 'negotiating';

  if (!agreement) return 'send_agreement';

  if (agreement.renewalFinalized || (agreement.signedByTenantAt && agreement.signedByLandlordAt)) {
    return 'completed';
  }

  if (agreement.signedByTenantAt && !agreement.signedByLandlordAt) {
    return 'counter_sign';
  }

  if (agreement.signedByLandlordAt && !agreement.signedByTenantAt) {
    return 'awaiting_tenant_sign';
  }

  return agreement.signedByTenantAt ? 'counter_sign' : 'awaiting_tenant_sign';
}

export function isRenewalWorkflowBlocking(status: string, workflowPhase?: RenewalWorkflowPhase): boolean {
  if (['PENDING', 'COUNTER_OFFER'].includes(status)) return true;
  if (status === 'ACCEPTED') {
    return workflowPhase !== 'completed' && workflowPhase !== 'rejected' && workflowPhase !== 'expired';
  }
  return false;
}

async function loadAgreementsForApplicationIds(applicationIds: string[]): Promise<AgreementRow[]> {
  if (applicationIds.length === 0) return [];

  return prismaClient.agreementDocument.findMany({
    where: { applicationId: { in: applicationIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      applicationId: true,
      signedByTenantAt: true,
      signedByLandlordAt: true,
      metadata: true,
      createdAt: true,
    },
  });
}

function toAgreementState(row: AgreementRow): RenewalAgreementState {
  return {
    agreementDocumentId: row.id,
    applicationId: row.applicationId,
    signedByTenantAt: row.signedByTenantAt,
    signedByLandlordAt: row.signedByLandlordAt,
    renewalFinalized: isRenewalFinalized(row.metadata),
  };
}

function findAgreementForRenewal(
  proposalId: string,
  renewal: { respondedAt?: Date | string | null; createdAt?: Date | string | null },
  agreements: AgreementRow[]
): RenewalAgreementState | null {
  for (const row of agreements) {
    if (readRenewalProposalId(row.metadata) === proposalId) {
      return toAgreementState(row);
    }
  }

  const respondedAt = renewal.respondedAt
    ? new Date(renewal.respondedAt)
    : renewal.createdAt
      ? new Date(renewal.createdAt)
      : null;

  for (const row of agreements) {
    const meta = row.metadata as Record<string, unknown> | null;
    if (meta?.source === 'lease_renewal') {
      if (!respondedAt || !Number.isNaN(respondedAt.getTime())) {
        if (!respondedAt || row.createdAt >= respondedAt) {
          return toAgreementState(row);
        }
      }
    }
  }

  if (respondedAt && !Number.isNaN(respondedAt.getTime())) {
    const candidates = agreements
      .filter((row) => row.createdAt >= respondedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    for (const row of candidates) {
      if (
        (!row.signedByTenantAt || !row.signedByLandlordAt) &&
        !isRenewalFinalized(row.metadata)
      ) {
        return toAgreementState(row);
      }
    }

    for (const row of candidates) {
      if (row.signedByTenantAt && row.signedByLandlordAt) {
        return toAgreementState(row);
      }
    }
  }

  return null;
}

function mapAgreementsByProposalId(agreements: AgreementRow[]): Map<string, RenewalAgreementState> {
  const map = new Map<string, RenewalAgreementState>();

  for (const row of agreements) {
    const proposalId = readRenewalProposalId(row.metadata);
    if (!proposalId || map.has(proposalId)) continue;

    map.set(proposalId, toAgreementState(row));
  }

  return map;
}

export async function attachRenewalWorkflow<T extends Record<string, unknown>>(
  renewal: T
): Promise<T & RenewalWorkflowState> {
  const applicationId =
    (renewal as any).tenant?.applicationId ??
    (renewal as any).tenant?.application?.id ??
    null;

  let agreement: RenewalAgreementState | null = null;

  if (applicationId) {
    const agreements = await loadAgreementsForApplicationIds([applicationId]);
    agreement =
      findAgreementForRenewal(String(renewal.id), renewal as any, agreements) ??
      mapAgreementsByProposalId(agreements).get(String(renewal.id)) ??
      null;
  }

  const workflowPhase = resolveRenewalWorkflowPhase(String(renewal.status), agreement);

  if (
    agreement?.signedByTenantAt &&
    agreement?.signedByLandlordAt &&
    !agreement.renewalFinalized &&
    agreement.agreementDocumentId
  ) {
    finalizeRenewalAfterCounterSign(agreement.agreementDocumentId).catch((error) => {
      console.error('Failed to finalize renewal during workflow attach:', error);
    });
  }

  return {
    ...renewal,
    workflowPhase,
    agreement,
  };
}

export async function attachRenewalWorkflowBatch<T extends Record<string, unknown>>(
  renewals: T[]
): Promise<Array<T & RenewalWorkflowState>> {
  if (renewals.length === 0) return [];

  const applicationIds = [
    ...new Set(
      renewals
        .map(
          (renewal) =>
            (renewal as any).tenant?.applicationId ??
            (renewal as any).tenant?.application?.id
        )
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const agreements = await loadAgreementsForApplicationIds(applicationIds);
  const byProposalId = mapAgreementsByProposalId(agreements);

  return renewals.map((renewal) => {
    const agreementsForApp = agreements.filter(
      (row) =>
        row.applicationId ===
        ((renewal as any).tenant?.applicationId ?? (renewal as any).tenant?.application?.id)
    );
    const agreement =
      findAgreementForRenewal(String(renewal.id), renewal as any, agreementsForApp) ??
      byProposalId.get(String(renewal.id)) ??
      null;
    const workflowPhase = resolveRenewalWorkflowPhase(String(renewal.status), agreement);
    return { ...renewal, workflowPhase, agreement };
  });
}

async function createRentIncreaseBillForProposal(proposal: {
  id: string;
  tenantId: string;
  propertyId: string;
  property: { landlordId: string };
  currentRent: unknown;
  proposedRent: unknown;
  status: string;
  renewalTerms: unknown;
  counterOffer?: unknown;
}) {
  const effective = resolveEffectiveRenewalTerms(proposal as Parameters<typeof resolveEffectiveRenewalTerms>[0]);
  const effectiveRent = effective.proposedRent;
  const currentRent = Number(proposal.currentRent ?? 0);

  if (!Number.isFinite(effectiveRent) || effectiveRent <= currentRent) return null;

  const existingBill = await prismaClient.billsSubCategory.findFirst({
    where: {
      tenantId: proposal.tenantId,
      propertyId: proposal.propertyId,
      billName: { in: ['Renewal rent', 'Rent increase'] },
      isDeleted: false,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingBill) return existingBill;

  const billTemplateService = (await import('./billTemplate.service')).default;
  const terms = (effective.renewalTerms || proposal.renewalTerms) as { startDate?: string } | null;
  const effectiveStart = parseRenewalTermStartDate(terms);
  const dueDate = effectiveStart ?? new Date();

  const rentBill = await billTemplateService.createRenewalRentBill({
    landlordId: proposal.property.landlordId,
    propertyId: proposal.propertyId,
    tenantId: proposal.tenantId,
    oldRent: currentRent,
    newRent: Number(effectiveRent),
    dueDate,
    effectiveDate: effectiveStart ?? dueDate,
  });

  if (rentBill && serverInstance.paymentNotificationService) {
    await serverInstance.paymentNotificationService.sendNewBillNotification(rentBill.id);
  }

  return rentBill;
}

export async function sendRenewalAgreement(
  proposalId: string,
  landlordUserId: string
): Promise<{ renewalAgreement: RenewalAgreementResult; workflowPhase: RenewalWorkflowPhase }> {
  const proposal = await prismaClient.leaseRenewal.findUnique({
    where: { id: proposalId },
    include: {
      tenant: {
        include: { user: true },
      },
      property: {
        include: {
          landlord: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!proposal || proposal.property.landlord.userId !== landlordUserId) {
    throw ApiError.badRequest("Proposal not found or you don't have permission to send the agreement");
  }

  if (proposal.status !== 'ACCEPTED') {
    throw ApiError.badRequest('Agreement can only be sent after the renewal proposal is accepted');
  }

  const effective = resolveEffectiveRenewalTerms(proposal as Parameters<typeof resolveEffectiveRenewalTerms>[0]);
  const existingAgreements = proposal.tenant.applicationId
    ? await loadAgreementsForApplicationIds([proposal.tenant.applicationId])
    : [];
  const existing =
    findAgreementForRenewal(proposalId, proposal, existingAgreements) ??
    mapAgreementsByProposalId(existingAgreements).get(proposalId) ??
    null;

  if (existing) {
    return {
      renewalAgreement: {
        agreementDocumentId: existing.agreementDocumentId,
        applicationId: existing.applicationId,
      },
      workflowPhase: resolveRenewalWorkflowPhase(proposal.status, existing),
    };
  }

  const renewalAgreement = await createRenewalAgreementDocument(proposal, {
    proposedRent: effective.proposedRent,
    renewalTerms: effective.renewalTerms,
  });

  if (!renewalAgreement) {
    throw ApiError.badRequest(
      'Could not create renewal agreement. Ensure the tenant has a linked application and you have an agreement template.'
    );
  }

  try {
    await createRentIncreaseBillForProposal(proposal);
  } catch (billError) {
    console.error('Failed to create rent increase bill when sending renewal agreement:', billError);
  }

  if (proposal.tenant.user.id) {
    const destId = proposal.tenant.user.id;
    const title = 'Sign your renewal lease';
    const message = `Your renewal for ${proposal.property.name} is ready. Open Documents to sign.`;
    const route = '/profile/Documents';

    try {
      const NotificationService = (await import('./notification.service')).default;
      const created = await NotificationService.createNotification(
        {
          destId,
          title,
          message,
          notificationType: 'LEASE_AGREEMENT_PENDING',
          route,
          type: 'info',
          // Enriched emit below carries renewal document ids
          emitRealtime: false,
        },
        'COMMUNICATION'
      );

      if (serverInstance?.io) {
        serverInstance.io.to(`user:${destId}`).emit('notification', {
          id: created?.id,
          type: 'LEASE_AGREEMENT_PENDING',
          notificationType: 'LEASE_AGREEMENT_PENDING',
          title,
          message,
          route,
          actionUrl: route,
          category: 'COMMUNICATION',
          applicationId: renewalAgreement.applicationId,
          agreementDocumentId: renewalAgreement.agreementDocumentId,
          propertyId: proposal.propertyId,
          timestamp: created?.createdAt || new Date(),
          userId: destId,
          isRead: false,
        });
      }
    } catch (notifyError) {
      console.error('Failed to persist LEASE_AGREEMENT_PENDING notification:', notifyError);
    }
  }

  const agreementState: RenewalAgreementState = {
    agreementDocumentId: renewalAgreement.agreementDocumentId,
    applicationId: renewalAgreement.applicationId,
    signedByTenantAt: null,
    signedByLandlordAt: null,
    renewalFinalized: false,
  };

  return {
    renewalAgreement,
    workflowPhase: resolveRenewalWorkflowPhase(proposal.status, agreementState),
  };
}

export async function finalizeRenewalAfterCounterSign(agreementId: string): Promise<void> {
  const agreement = await prismaClient.agreementDocument.findUnique({
    where: { id: agreementId },
    include: {
      application: true,
    },
  });

  if (!agreement?.signedByTenantAt || !agreement.signedByLandlordAt) return;

  const metadata = agreement.metadata as Record<string, unknown> | null;
  let proposalId = readRenewalProposalId(metadata);
  if (!proposalId) {
    proposalId = await resolveRenewalProposalIdForAgreement({
      applicationId: agreement.applicationId,
      createdAt: agreement.createdAt,
    });
  }
  if (!proposalId || isRenewalFinalized(metadata)) return;

  const proposal = await prismaClient.leaseRenewal.findUnique({
    where: { id: proposalId },
    include: {
      property: true,
      tenant: true,
    },
  });

  if (!proposal || proposal.status !== 'ACCEPTED') return;

  const effective = resolveEffectiveRenewalTerms(proposal as Parameters<typeof resolveEffectiveRenewalTerms>[0]);
  const terms = effective.renewalTerms || proposal.renewalTerms;
  const startDate = parseRenewalTermStartDate(terms);
  const endDate = parseRenewalTermEndDate(terms);
  const effectiveRent = effective.proposedRent;
  const rentEffectiveNow = isRenewalRentEffectiveOnOrBefore(startDate);
  const existingMetadata = (metadata ?? {}) as Record<string, unknown>;

  if (rentEffectiveNow) {
    if (startDate || endDate) {
      await prismaClient.tenants.update({
        where: { id: proposal.tenantId },
        data: {
          ...(startDate ? { leaseStartDate: startDate } : {}),
          ...(endDate ? { leaseEndDate: endDate } : {}),
          isCurrentLease: true,
        },
      });
    }

    if (Number.isFinite(effectiveRent)) {
      const propertyBefore = await prismaClient.properties.findUnique({
        where: { id: proposal.propertyId },
        select: { price: true, currency: true, landlordId: true },
      });
      const oldRent = Number(propertyBefore?.price ?? proposal.currentRent ?? 0);

      await prismaClient.properties.update({
        where: { id: proposal.propertyId },
        data: { price: effectiveRent },
      });

      if (oldRent !== Number(effectiveRent) && proposal.tenant?.userId) {
        try {
          const tenancyChangeNotification = (
            await import('./tenancyChangeNotification.service')
          );
          await tenancyChangeNotification.notifyPropertyTenancyFinancialChanges({
            propertyId: proposal.propertyId,
            landlordId: propertyBefore?.landlordId ?? proposal.property.landlordId,
            landlordUserId: undefined,
            currency: proposal.property?.currency ? String(proposal.property.currency) : null,
            oldRent,
            newRent: Number(effectiveRent),
            effectiveDate: startDate,
            reason: 'renewal agreement',
          });
        } catch (notifyError) {
          console.error('Failed to notify tenant of immediate renewal rent:', notifyError);
        }
      }
    }

    await prismaClient.agreementDocument.update({
      where: { id: agreementId },
      data: {
        metadata: {
          ...existingMetadata,
          renewalFinalized: true,
          finalizedAt: new Date().toISOString(),
          rentEffectiveFrom: (startDate ?? new Date()).toISOString(),
          pendingLeaseUpdate: undefined,
        },
      },
    });
    return;
  }

  const pendingLeaseUpdate: PendingLeaseUpdate = {
    startDate: (startDate ?? new Date()).toISOString(),
    ...(endDate ? { endDate: endDate.toISOString() } : {}),
    rent: Number(effectiveRent),
    tenantId: proposal.tenantId,
    propertyId: proposal.propertyId,
    proposalId,
  };

  await prismaClient.agreementDocument.update({
    where: { id: agreementId },
    data: {
      metadata: {
        ...existingMetadata,
        renewalFinalized: true,
        finalizedAt: new Date().toISOString(),
        rentEffectiveFrom: pendingLeaseUpdate.startDate,
        pendingLeaseUpdate,
      },
    },
  });

  try {
    const tenantUser = await prismaClient.tenants.findUnique({
      where: { id: proposal.tenantId },
      select: {
        userId: true,
        property: { select: { price: true, currency: true, landlordId: true } },
      },
    });
    if (tenantUser?.userId) {
      const oldRent = Number(tenantUser.property?.price ?? proposal.currentRent ?? 0);
      const tenancyChangeNotification = (await import('./tenancyChangeNotification.service'));
      await tenancyChangeNotification.notifyTenantScheduledRentChange({
        tenantUserId: tenantUser.userId,
        landlordId: tenantUser.property?.landlordId ?? proposal.property.landlordId,
        oldRent,
        newRent: Number(effectiveRent),
        effectiveDate: startDate ?? new Date(pendingLeaseUpdate.startDate),
        currency: proposal.property?.currency ? String(proposal.property.currency) : null,
      });
    }
  } catch (notifyError) {
    console.error('Failed to notify tenant of scheduled rent change:', notifyError);
  }
}

/** Apply renewal rent and lease dates once the agreed start date is reached. */
export async function applyPendingRenewalLeaseUpdates(): Promise<number> {
  const agreements = await prismaClient.agreementDocument.findMany({
    where: {
      signedByTenantAt: { not: null },
      signedByLandlordAt: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: {
      id: true,
      metadata: true,
    },
  });

  let applied = 0;

  for (const agreement of agreements) {
    const pending = readPendingLeaseUpdate(agreement.metadata);
    if (!pending || pending.appliedAt) continue;

    const startDate = new Date(pending.startDate);
    if (!isRenewalRentEffectiveOnOrBefore(startDate)) continue;

    const endDate = pending.endDate ? new Date(pending.endDate) : null;

    await prismaClient.tenants.update({
      where: { id: pending.tenantId },
      data: {
        leaseStartDate: startDate,
        ...(endDate && !Number.isNaN(endDate.getTime()) ? { leaseEndDate: endDate } : {}),
        isCurrentLease: true,
      },
    });

    if (Number.isFinite(pending.rent)) {
      const propertyBefore = await prismaClient.properties.findUnique({
        where: { id: pending.propertyId },
        select: { price: true, currency: true, landlordId: true },
      });
      const oldRent = Number(propertyBefore?.price ?? 0);

      await prismaClient.properties.update({
        where: { id: pending.propertyId },
        data: { price: pending.rent },
      });

      const tenantUser = await prismaClient.tenants.findUnique({
        where: { id: pending.tenantId },
        select: { userId: true },
      });
      if (tenantUser?.userId && propertyBefore?.landlordId) {
        try {
          const tenancyChangeNotification = (
            await import('./tenancyChangeNotification.service')
          );
          await tenancyChangeNotification.notifyAppliedScheduledRentChange({
            tenantUserId: tenantUser.userId,
            landlordId: propertyBefore.landlordId,
            oldRent,
            newRent: Number(pending.rent),
            currency: propertyBefore.currency ? String(propertyBefore.currency) : null,
          });
        } catch (notifyError) {
          console.error('Failed to notify tenant of applied scheduled rent:', notifyError);
        }
      }
    }

    const existingMetadata =
      agreement.metadata && typeof agreement.metadata === 'object'
        ? (agreement.metadata as Record<string, unknown>)
        : {};

    await prismaClient.agreementDocument.update({
      where: { id: agreement.id },
      data: {
        metadata: {
          ...existingMetadata,
          pendingLeaseUpdate: {
            ...pending,
            appliedAt: new Date().toISOString(),
          },
          rentEffectiveFrom: pending.startDate,
        },
      },
    });

    applied += 1;
  }

  if (applied > 0) {
    console.log(`[Renewal] Applied ${applied} scheduled lease/rent update(s)`);
  }

  return applied;
}

export function getRenewalRentEffectiveMessage(terms: unknown): string {
  const startDate = parseRenewalTermStartDate(terms);
  if (!startDate) {
    return 'New rent applies once the renewal is fully signed.';
  }
  if (isRenewalRentEffectiveOnOrBefore(startDate)) {
    return `New rent is in effect from ${formatRenewalEffectiveDate(startDate)}.`;
  }
  return `New rent takes effect from ${formatRenewalEffectiveDate(startDate)}. Current rent stays until then.`;
}
