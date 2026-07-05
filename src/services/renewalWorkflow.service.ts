import { prismaClient } from '..';
import { serverInstance } from '../index';
import { ApiError } from '../utils/ApiError';
import { resolveEffectiveRenewalTerms } from '../utils/leaseRenewalHelpers';
import {
  createRenewalAgreementDocument,
  type RenewalAgreementResult,
} from './renewalAgreement.service';

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
  return typeof proposalId === 'string' ? proposalId : undefined;
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
    for (const row of agreements) {
      if (
        row.createdAt >= respondedAt &&
        (!row.signedByTenantAt || !row.signedByLandlordAt) &&
        !isRenewalFinalized(row.metadata)
      ) {
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
      billName: 'Rent increase',
      isDeleted: false,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingBill) return existingBill;

  const billTemplateService = (await import('./billTemplate.service')).default;
  const terms = (effective.renewalTerms || proposal.renewalTerms) as { startDate?: string } | null;
  const dueDate = terms?.startDate ? new Date(terms.startDate) : new Date();

  const rentBill = await billTemplateService.createRentIncreaseBill({
    landlordId: proposal.property.landlordId,
    propertyId: proposal.propertyId,
    tenantId: proposal.tenantId,
    oldRent: currentRent,
    newRent: Number(effectiveRent),
    dueDate,
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
    if (serverInstance?.io) {
      serverInstance.io.to(`user_${proposal.tenant.user.id}`).emit('notification', {
        type: 'LEASE_AGREEMENT_PENDING',
        title: 'Sign your renewal lease',
        message: `Your renewal for ${proposal.property.name} is ready. Open Documents to sign.`,
        applicationId: renewalAgreement.applicationId,
        agreementDocumentId: renewalAgreement.agreementDocumentId,
        propertyId: proposal.propertyId,
        timestamp: new Date(),
        userId: proposal.tenant.user.id,
      });
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
  const proposalId = readRenewalProposalId(metadata);
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
  const terms = (effective.renewalTerms || proposal.renewalTerms) as
    | { startDate?: string; endDate?: string; duration?: string }
    | null;

  if (terms && (terms.startDate || terms.endDate)) {
    const startDate = terms.startDate ? new Date(terms.startDate) : undefined;
    const endDate = terms.endDate ? new Date(terms.endDate) : undefined;

    await prismaClient.tenants.update({
      where: { id: proposal.tenantId },
      data: {
        ...(startDate && !Number.isNaN(startDate.getTime()) ? { leaseStartDate: startDate } : {}),
        ...(endDate && !Number.isNaN(endDate.getTime()) ? { leaseEndDate: endDate } : {}),
        isCurrentLease: true,
      },
    });
  }

  const effectiveRent = effective.proposedRent;
  if (Number.isFinite(effectiveRent)) {
    await prismaClient.properties.update({
      where: { id: proposal.propertyId },
      data: { price: effectiveRent },
    });
  }

  await prismaClient.agreementDocument.update({
    where: { id: agreementId },
    data: {
      metadata: {
        ...(metadata ?? {}),
        renewalFinalized: true,
        finalizedAt: new Date().toISOString(),
      },
    },
  });
}
