export type PendingLeaseUpdate = {
  startDate: string;
  endDate?: string;
  rent: number;
  tenantId: string;
  propertyId: string;
  proposalId?: string;
  appliedAt?: string;
};

export function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseRenewalTermStartDate(terms: unknown): Date | null {
  if (!terms || typeof terms !== 'object') return null;
  const raw = (terms as { startDate?: unknown }).startDate;
  if (!raw) return null;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseRenewalTermEndDate(terms: unknown): Date | null {
  if (!terms || typeof terms !== 'object') return null;
  const raw = (terms as { endDate?: unknown }).endDate;
  if (!raw) return null;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isRenewalRentEffectiveOnOrBefore(
  startDate: Date | null,
  referenceDate: Date = new Date()
): boolean {
  if (!startDate) return true;
  return startOfCalendarDay(startDate).getTime() <= startOfCalendarDay(referenceDate).getTime();
}

export function formatRenewalEffectiveDate(
  startDate: Date | null,
  locale = 'en-GB'
): string {
  if (!startDate) return 'when the renewal is finalized';
  return startDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function buildRenewalRentBillDescription(params: {
  oldRent: number;
  newRent: number;
  effectiveDate: Date;
}): string {
  const effectiveLabel = formatRenewalEffectiveDate(params.effectiveDate);
  return `Renewal rent from ${effectiveLabel} — ${params.newRent} per period (previous rent was ${params.oldRent})`;
}

export function readPendingLeaseUpdate(metadata: unknown): PendingLeaseUpdate | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const pending = (metadata as { pendingLeaseUpdate?: unknown }).pendingLeaseUpdate;
  if (!pending || typeof pending !== 'object') return null;
  const record = pending as Record<string, unknown>;
  const startDate = typeof record.startDate === 'string' ? record.startDate : null;
  const tenantId = typeof record.tenantId === 'string' ? record.tenantId : null;
  const propertyId = typeof record.propertyId === 'string' ? record.propertyId : null;
  const rent = Number(record.rent);
  if (!startDate || !tenantId || !propertyId || !Number.isFinite(rent)) return null;
  return {
    startDate,
    endDate: typeof record.endDate === 'string' ? record.endDate : undefined,
    rent,
    tenantId,
    propertyId,
    proposalId: typeof record.proposalId === 'string' ? record.proposalId : undefined,
    appliedAt: typeof record.appliedAt === 'string' ? record.appliedAt : undefined,
  };
}
