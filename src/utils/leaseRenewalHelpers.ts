/** Shared lease renewal helpers for API responses and service validation. */

export type RenewalInitiator = 'TENANT' | 'LANDLORD';

export function resolveRenewalInitiator(
  proposedBy: string,
  tenantUserId: string,
  landlordUserId: string
): RenewalInitiator {
  if (proposedBy === tenantUserId) return 'TENANT';
  if (proposedBy === landlordUserId) return 'LANDLORD';
  return proposedBy === tenantUserId ? 'TENANT' : 'LANDLORD';
}

export function enrichLeaseRenewal<T extends Record<string, unknown>>(renewal: T): T & { initiatedBy: RenewalInitiator } {
  const tenantUserId = (renewal as any).tenant?.userId ?? (renewal as any).tenant?.user?.id;
  const landlordUserId = (renewal as any).property?.landlord?.userId ?? (renewal as any).property?.landlord?.user?.id;
  const proposedBy = (renewal as any).proposedBy as string;

  return {
    ...renewal,
    initiatedBy: resolveRenewalInitiator(proposedBy, tenantUserId, landlordUserId),
  };
}

export function canUserRespondToRenewal(
  userId: string,
  proposal: {
    status: string;
    proposedBy: string;
    respondedBy?: string | null;
  }
): boolean {
  if (!['PENDING', 'COUNTER_OFFER'].includes(proposal.status)) {
    return false;
  }
  if (proposal.status === 'PENDING') {
    return userId !== proposal.proposedBy;
  }
  // Counter-offer: the party who did NOT submit the counter must respond next.
  return Boolean(proposal.respondedBy && proposal.respondedBy !== userId);
}

export function resolveEffectiveRenewalTerms(proposal: {
  status: string;
  proposedRent: unknown;
  renewalTerms: unknown;
  counterOffer?: {
    proposedRent?: number;
    renewalTerms?: unknown;
  } | null;
}): { proposedRent: number; renewalTerms: unknown } {
  if (proposal.status === 'COUNTER_OFFER' && proposal.counterOffer) {
    return {
      proposedRent: Number(proposal.counterOffer.proposedRent ?? proposal.proposedRent),
      renewalTerms: proposal.counterOffer.renewalTerms ?? proposal.renewalTerms,
    };
  }
  return {
    proposedRent: Number(proposal.proposedRent),
    renewalTerms: proposal.renewalTerms,
  };
}
