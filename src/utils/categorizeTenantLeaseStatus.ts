/**
 * Single source of truth for current / previous (past) / future tenant buckets.
 * Used by property tenants API and dashboard analytics.
 */

export type TenantLeaseBucket = 'current' | 'previous' | 'future';

export type TenantLeaseCategorizationInput = {
  leaseStartDate: Date | string | null;
  leaseEndDate?: Date | string | null;
  isCurrentLease?: boolean | null;
};

/** Returns null when leaseStartDate is missing (same as property tenants UI). */
export const categorizeTenantLeaseBucket = (
  tenant: TenantLeaseCategorizationInput,
  referenceDate: Date = new Date()
): TenantLeaseBucket | null => {
  if (!tenant.leaseStartDate) {
    return null;
  }

  const leaseStart = new Date(tenant.leaseStartDate);
  const leaseEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null;

  if (
    tenant.isCurrentLease === true ||
    (leaseStart <= referenceDate && (!leaseEnd || leaseEnd >= referenceDate))
  ) {
    return 'current';
  }

  if (leaseEnd && leaseEnd < referenceDate) {
    return 'previous';
  }

  if (leaseStart > referenceDate) {
    return 'future';
  }

  return null;
};

export const countTenantsByLeaseBucket = (
  tenants: TenantLeaseCategorizationInput[],
  referenceDate: Date = new Date()
) => {
  let current = 0;
  let previous = 0;
  let future = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const bucket = categorizeTenantLeaseBucket(tenant, referenceDate);
    if (bucket === null) {
      skipped += 1;
      continue;
    }
    if (bucket === 'current') current += 1;
    else if (bucket === 'previous') previous += 1;
    else future += 1;
  }

  const total = current + previous + future;
  const pct = (n: number) =>
    total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

  return {
    current,
    previous,
    future,
    past: previous,
    total,
    skipped,
    currentPercent: pct(current),
    futurePercent: pct(future),
    pastPercent: pct(previous),
  };
};

export const groupTenantsByLeaseBucket = <T extends TenantLeaseCategorizationInput>(
  tenants: T[],
  referenceDate: Date = new Date()
) => {
  const grouped: { current: T[]; previous: T[]; future: T[] } = {
    current: [],
    previous: [],
    future: [],
  };

  for (const tenant of tenants) {
    const bucket = categorizeTenantLeaseBucket(tenant, referenceDate);
    if (bucket === null) continue;
    grouped[bucket].push(tenant);
  }

  return grouped;
};
