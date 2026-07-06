import { PayableBy, PropertyType } from '@prisma/client';
import { prismaClient } from '..';

/** Property types where bills are assigned per tenant/unit, not property-wide. */
const SHARED_OCCUPANCY_PROPERTY_TYPES = new Set<string>([
  PropertyType.MULTI_UNIT,
  PropertyType.HIGH_RISE_BUILDING,
  PropertyType.HIGH_RISE_COMMERCIAL_BUILDING,
  PropertyType.HOUSE_MULTIPLE_OCCUPATION,
  PropertyType.SHARED_HOUSE,
  PropertyType.MIXED_USE_BUILDING,
  PropertyType.RENTAL_ROOM,
]);

export type TenantBillAccessScope = {
  tenantId: string;
  propertyId: string | null;
  landlordId: string | null;
  /** When true, tenant also sees property-wide bills (no tenantId on bill). */
  includePropertyWideBills: boolean;
};

function readBooleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

/**
 * A property is "shared occupancy" when multiple tenants/units share one listing
 * (multi-let, HMO, high-rise, etc.). Property-wide bills only apply on simple
 * single-tenant properties.
 */
export async function isSharedOccupancyProperty(propertyId: string): Promise<boolean> {
  const [spec, activeTenantCount] = await Promise.all([
    prismaClient.propertySpecification.findFirst({
      where: { propertyId, isActive: true },
      select: {
        propertySubType: true,
        otherTypeSpecific: true,
        residential: {
          select: {
            totalUnits: true,
            isHMO: true,
            isShareHouse: true,
          },
        },
      },
    }),
    prismaClient.tenants.count({
      where: {
        propertyId,
        isCurrentLease: true,
        isDeleted: false,
      },
    }),
  ]);

  if (activeTenantCount > 1) {
    return true;
  }

  const subType = spec?.propertySubType ? String(spec.propertySubType) : '';
  if (SHARED_OCCUPANCY_PROPERTY_TYPES.has(subType)) {
    return true;
  }

  const other = (spec?.otherTypeSpecific ?? {}) as Record<string, unknown>;
  if (readBooleanFlag(other.isMultiUnit)) {
    return true;
  }

  const totalUnits = spec?.residential?.totalUnits;
  if (typeof totalUnits === 'number' && totalUnits > 1) {
    return true;
  }

  if (spec?.residential?.isHMO || spec?.residential?.isShareHouse) {
    return true;
  }

  return false;
}

/**
 * Default: tenants on a simple property see all property bills.
 * Multi-unit / high-rise / unit-room tenants only see bills assigned to them.
 */
export async function shouldTenantSeePropertyWideBills(
  tenantId: string,
  propertyId: string | null,
  tenantHints?: { unitId?: string | null; roomId?: string | null }
): Promise<boolean> {
  if (!propertyId) {
    return false;
  }

  let unitId = tenantHints?.unitId;
  let roomId = tenantHints?.roomId;

  if (unitId === undefined && roomId === undefined) {
    const tenant = await prismaClient.tenants.findUnique({
      where: { id: tenantId },
      select: { unitId: true, roomId: true },
    });
    unitId = tenant?.unitId;
    roomId = tenant?.roomId;
  }

  if (unitId || roomId) {
    return false;
  }

  return !(await isSharedOccupancyProperty(propertyId));
}

export async function resolveTenantBillAccessScope(
  tenantId: string
): Promise<TenantBillAccessScope> {
  const tenant = await prismaClient.tenants.findUnique({
    where: { id: tenantId },
    select: {
      propertyId: true,
      landlordId: true,
      unitId: true,
      roomId: true,
    },
  });

  if (!tenant) {
    return {
      tenantId,
      propertyId: null,
      landlordId: null,
      includePropertyWideBills: false,
    };
  }

  const includePropertyWideBills = tenant.propertyId
    ? await shouldTenantSeePropertyWideBills(tenantId, tenant.propertyId, tenant)
    : false;

  return {
    tenantId,
    propertyId: tenant.propertyId,
    landlordId: tenant.landlordId,
    includePropertyWideBills,
  };
}

export function buildTenantAccessibleBillWhere(
  tenantId: string,
  propertyId: string | null,
  includePropertyWideBills: boolean
) {
  const orConditions: Array<Record<string, unknown>> = [{ tenantId }];

  if (propertyId && includePropertyWideBills) {
    orConditions.push({ tenantId: null, propertyId });
  }

  return {
    isDeleted: false,
    payableBy: PayableBy.TENANT,
    OR: orConditions,
  };
}

/**
 * Who should be notified for a new/updated bill.
 * Property-wide bills notify all tenants only on simple (non shared-occupancy) properties.
 */
export async function resolveBillNotificationRecipientUserIds(bill: {
  tenantId?: string | null;
  propertyId?: string | null;
  landlordId?: string | null;
  tenants?: { user?: { id: string } | null } | null;
}): Promise<string[]> {
  const userIds = new Set<string>();

  if (bill.tenantId && bill.tenants?.user?.id) {
    userIds.add(bill.tenants.user.id);
    return Array.from(userIds);
  }

  if (bill.propertyId) {
    const sharedOccupancy = await isSharedOccupancyProperty(bill.propertyId);
    if (sharedOccupancy) {
      return [];
    }

    const propertyTenants = await prismaClient.tenants.findMany({
      where: {
        propertyId: bill.propertyId,
        isCurrentLease: true,
        isDeleted: false,
        unitId: null,
        roomId: null,
      },
      select: { userId: true },
    });
    propertyTenants.forEach((t) => userIds.add(t.userId));
    return Array.from(userIds);
  }

  return [];
}
