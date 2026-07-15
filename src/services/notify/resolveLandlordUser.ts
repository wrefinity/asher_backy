import { prismaClient } from '../../db/prismaClient';

export type LandlordUserRef = {
  landlordId: string;
  userId: string;
  email: string | null;
  propertyId: string | null;
};

type LandlordSelect = {
  id: string;
  userId: string;
  user: { email: string | null } | null;
};

function fromLandlord(
  landlord: LandlordSelect | null | undefined,
  propertyId: string | null
): LandlordUserRef | null {
  if (!landlord?.userId) return null;
  return {
    landlordId: landlord.id,
    userId: landlord.userId,
    email: landlord.user?.email ?? null,
    propertyId,
  };
}

const landlordSelect = {
  id: true,
  userId: true,
  user: { select: { email: true } },
} as const;

async function landlordFromPropertyId(
  propertyId: string
): Promise<LandlordUserRef | null> {
  const property = await prismaClient.properties.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      landlord: { select: landlordSelect },
    },
  });
  return fromLandlord(property?.landlord, property?.id ?? propertyId);
}

/**
 * Resolve landlord user from listing.
 * Prefer listing.propertyId; fall back via unit/room → specification → property.
 */
export async function resolveLandlordUserFromListingId(
  listingId: string
): Promise<LandlordUserRef | null> {
  if (!listingId?.trim()) return null;

  const listing = await prismaClient.propertyListingHistory.findUnique({
    where: { id: listingId },
    select: {
      propertyId: true,
      unitId: true,
      roomId: true,
      property: {
        select: {
          id: true,
          landlord: { select: landlordSelect },
        },
      },
    },
  });

  if (!listing) return null;

  const direct = fromLandlord(
    listing.property?.landlord,
    listing.property?.id ?? listing.propertyId
  );
  if (direct) return direct;

  if (listing.propertyId) {
    return landlordFromPropertyId(listing.propertyId);
  }

  if (listing.unitId) {
    const unit = await prismaClient.unitConfiguration.findUnique({
      where: { id: listing.unitId },
      select: {
        residentialPropertyId: true,
        commercialPropertyId: true,
      },
    });
    if (unit?.residentialPropertyId) {
      const spec = await prismaClient.propertySpecification.findFirst({
        where: {
          residentialId: unit.residentialPropertyId,
          isActive: true,
        },
        select: { propertyId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (spec?.propertyId) return landlordFromPropertyId(spec.propertyId);
    }
    if (unit?.commercialPropertyId) {
      const spec = await prismaClient.propertySpecification.findFirst({
        where: {
          commercialId: unit.commercialPropertyId,
          isActive: true,
        },
        select: { propertyId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (spec?.propertyId) return landlordFromPropertyId(spec.propertyId);
    }
  }

  if (listing.roomId) {
    const room = await prismaClient.roomDetail.findUnique({
      where: { id: listing.roomId },
      select: {
        residentialPropertyId: true,
        unit: {
          select: {
            residentialPropertyId: true,
            commercialPropertyId: true,
          },
        },
      },
    });
    const residentialId =
      room?.residentialPropertyId || room?.unit?.residentialPropertyId;
    if (residentialId) {
      const spec = await prismaClient.propertySpecification.findFirst({
        where: { residentialId, isActive: true },
        select: { propertyId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (spec?.propertyId) return landlordFromPropertyId(spec.propertyId);
    }
  }

  return null;
}

export async function resolveLandlordUserFromPropertyId(
  propertyId: string
): Promise<LandlordUserRef | null> {
  if (!propertyId?.trim()) return null;
  return landlordFromPropertyId(propertyId);
}
