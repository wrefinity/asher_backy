import { prismaClient, serverInstance } from '..';
import {
  formatRenewalEffectiveDate,
  isRenewalRentEffectiveOnOrBefore,
  readPendingLeaseUpdate,
  type PendingLeaseUpdate,
} from '../utils/renewalEffectiveDate';
import { isSharedOccupancyProperty } from '../utils/billScope.util';
import pendingRentAdjustmentService from './pendingRentAdjustment.service';

type FinancialChangeType = 'rent' | 'deposit';

export type ScheduledRentChangeRow = PendingLeaseUpdate & {
  tenantName: string;
  tenantId: string;
  agreementId: string;
};

async function getPropertyTenantRecipients(propertyId: string) {
  const sharedOccupancy = await isSharedOccupancyProperty(propertyId);
  const tenants = await prismaClient.tenants.findMany({
    where: {
      propertyId,
      isCurrentLease: true,
      isDeleted: false,
      ...(sharedOccupancy ? { unitId: null, roomId: null } : {}),
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullname: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!sharedOccupancy && tenants.length === 0) {
    return prismaClient.tenants.findMany({
      where: { propertyId, isCurrentLease: true, isDeleted: false },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  return tenants;
}

function formatMoney(value: number, currency?: string | null): string {
  const code = currency ? String(currency) : 'NGN';
  return `${code} ${value.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export async function notifyPropertyTenancyFinancialChanges(params: {
  propertyId: string;
  landlordId: string;
  landlordUserId?: string | null;
  currency?: string | null;
  oldRent?: number;
  newRent?: number;
  oldDeposit?: number;
  newDeposit?: number;
  effectiveDate?: Date | null;
  reason?: string;
}): Promise<void> {
  if (!serverInstance.paymentNotificationService) return;

  const tenants = await getPropertyTenantRecipients(params.propertyId);
  if (tenants.length === 0) return;

  const rentChanged =
    params.newRent != null &&
    params.oldRent != null &&
    Number(params.newRent) !== Number(params.oldRent);
  const depositChanged =
    params.newDeposit != null &&
    params.oldDeposit != null &&
    Number(params.newDeposit) !== Number(params.oldDeposit);

  for (const tenant of tenants) {
    const userId = tenant.user?.id ?? tenant.userId;
    if (!userId) continue;

    if (rentChanged) {
      await serverInstance.paymentNotificationService.sendTenancyFinancialChangeNotification({
        tenantUserId: userId,
        changeType: 'rent',
        oldAmount: Number(params.oldRent),
        newAmount: Number(params.newRent),
        currency: params.currency,
        effectiveDate: params.effectiveDate ?? null,
        landlordUserId: params.landlordUserId ?? undefined,
        landlordId: params.landlordId,
        reason: params.reason,
      });
    }

    if (depositChanged) {
      await serverInstance.paymentNotificationService.sendTenancyFinancialChangeNotification({
        tenantUserId: userId,
        changeType: 'deposit',
        oldAmount: Number(params.oldDeposit),
        newAmount: Number(params.newDeposit),
        currency: params.currency,
        effectiveDate: params.effectiveDate ?? null,
        landlordUserId: params.landlordUserId ?? undefined,
        landlordId: params.landlordId,
        reason: params.reason,
      });
    }
  }
}

export async function notifyTenantScheduledRentChange(params: {
  tenantUserId: string;
  landlordUserId?: string | null;
  landlordId?: string | null;
  oldRent: number;
  newRent: number;
  effectiveDate: Date;
  currency?: string | null;
}): Promise<void> {
  if (!serverInstance.paymentNotificationService) return;

  await serverInstance.paymentNotificationService.sendTenancyFinancialChangeNotification({
    tenantUserId: params.tenantUserId,
    changeType: 'rent',
    oldAmount: params.oldRent,
    newAmount: params.newRent,
    currency: params.currency,
    effectiveDate: params.effectiveDate,
    scheduled: true,
    landlordUserId: params.landlordUserId ?? undefined,
    landlordId: params.landlordId ?? undefined,
    reason: 'renewal agreement',
  });
}

export async function getTenantPendingRentChange(tenantId: string) {
  const tenant = await prismaClient.tenants.findUnique({
    where: { id: tenantId },
    select: {
      applicationId: true,
      propertyId: true,
      property: { select: { price: true, currency: true } },
    },
  });
  if (!tenant) return null;

  const manualPending =
    (await pendingRentAdjustmentService.getPendingForTenant(tenantId)) ??
    (tenant.propertyId
      ? await pendingRentAdjustmentService.getPendingForProperty(tenant.propertyId)
      : null);

  if (manualPending) {
    const currentRent = Number(tenant.property?.price ?? manualPending.oldRent);
    const effectiveDate = new Date(manualPending.effectiveDate);
    return {
      currentRent,
      newRent: manualPending.newRent,
      effectiveDate: manualPending.effectiveDate,
      effectiveDateLabel: formatRenewalEffectiveDate(effectiveDate),
      message: `From ${formatRenewalEffectiveDate(effectiveDate)} your rent will change from ${formatMoney(currentRent, tenant.property?.currency)} to ${formatMoney(manualPending.newRent, tenant.property?.currency)}.`,
      source: 'scheduled_adjustment',
      propertyId: manualPending.propertyId,
    };
  }

  if (!tenant.applicationId) return null;

  const agreements = await prismaClient.agreementDocument.findMany({
    where: {
      applicationId: tenant.applicationId,
      signedByTenantAt: { not: null },
      signedByLandlordAt: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, metadata: true },
  });

  for (const agreement of agreements) {
    const pending = readPendingLeaseUpdate(agreement.metadata);
    if (!pending || pending.appliedAt || pending.tenantId !== tenantId) continue;

    const effectiveDate = new Date(pending.startDate);
    if (isRenewalRentEffectiveOnOrBefore(effectiveDate)) continue;

    const currentRent = Number(tenant.property?.price ?? 0);
    return {
      currentRent,
      newRent: pending.rent,
      effectiveDate: pending.startDate,
      effectiveDateLabel: formatRenewalEffectiveDate(effectiveDate),
      message: `From ${formatRenewalEffectiveDate(effectiveDate)} your rent will change from ${formatMoney(currentRent, tenant.property?.currency)} to ${formatMoney(pending.rent, tenant.property?.currency)} under your signed renewal agreement.`,
      proposalId: pending.proposalId,
      propertyId: pending.propertyId,
    };
  }

  return null;
}

export async function getPropertyScheduledRentChanges(
  propertyId: string
): Promise<ScheduledRentChangeRow[]> {
  const manualRows = await pendingRentAdjustmentService.listPendingForProperty(propertyId);
  const rows: ScheduledRentChangeRow[] = [];

  for (const pending of manualRows) {
    if (!pending) continue;
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: pending.tenantId },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    const name =
      tenant?.user?.profile?.fullname ||
      [tenant?.user?.profile?.firstName, tenant?.user?.profile?.lastName]
        .filter(Boolean)
        .join(' ') ||
      tenant?.user?.email ||
      'Tenant';

    rows.push({
      tenantId: pending.tenantId,
      tenantName: name,
      agreementId: pending.logId,
      startDate: pending.effectiveDate,
      rent: pending.newRent,
      propertyId: pending.propertyId,
      proposalId: undefined,
    });
  }

  const tenants = await prismaClient.tenants.findMany({
    where: { propertyId, isCurrentLease: true, isDeleted: false },
    select: {
      id: true,
      user: {
        select: {
          email: true,
          profile: { select: { fullname: true, firstName: true, lastName: true } },
        },
      },
      applicationId: true,
    },
  });

  if (tenants.length === 0) return rows;

  const applicationIds = tenants
    .map((t) => t.applicationId)
    .filter((id): id is string => Boolean(id));

  if (applicationIds.length === 0) return rows;

  const agreements = await prismaClient.agreementDocument.findMany({
    where: {
      applicationId: { in: applicationIds },
      signedByTenantAt: { not: null },
      signedByLandlordAt: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      metadata: true,
    },
  });

  const seenTenants = new Set<string>(rows.map((r) => r.tenantId));

  for (const agreement of agreements) {
    const pending = readPendingLeaseUpdate(agreement.metadata);
    const tenantId = pending?.tenantId;
    if (!pending || pending.appliedAt || !tenantId || seenTenants.has(tenantId)) continue;
    if (pending.propertyId !== propertyId) continue;
    if (isRenewalRentEffectiveOnOrBefore(new Date(pending.startDate))) continue;

    const tenant = tenants.find((t) => t.id === tenantId);
    const profile = tenant?.user?.profile;
    const tenantName =
      profile?.fullname ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      tenant?.user?.email ||
      'Tenant';

    rows.push({
      ...pending,
      tenantId,
      tenantName,
      agreementId: agreement.id,
    });
    seenTenants.add(tenantId);
  }

  return rows.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export async function notifyAppliedScheduledRentChange(params: {
  tenantUserId: string;
  landlordId: string;
  oldRent: number;
  newRent: number;
  currency?: string | null;
}): Promise<void> {
  if (!serverInstance.paymentNotificationService) return;

  await serverInstance.paymentNotificationService.sendTenancyFinancialChangeNotification({
    tenantUserId: params.tenantUserId,
    changeType: 'rent',
    oldAmount: params.oldRent,
    newAmount: params.newRent,
    currency: params.currency,
    effectiveDate: new Date(),
    landlordId: params.landlordId,
    reason: 'renewal agreement now in effect',
  });
}
