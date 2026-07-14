import PropertyServices from '../services/propertyServices';

type InviteLike = {
  roomId?: string | null;
  unitId?: string | null;
  propertiesId?: string | null;
  propertyListingId?: string | null;
  enquires?: { propertyListingId?: string | null } | null;
} | null | undefined;

export type ResolvedApplicationStartEntity = {
  type: 'property' | 'unit' | 'room';
  data: { id: string; [key: string]: unknown };
  propertyId?: string;
  unitId?: string;
  roomId?: string;
};

async function trySearchPropertyUnitRoom(id?: string | null) {
  if (!id || id === 'undefined' || id === 'null') return null;
  try {
    return await PropertyServices.searchPropertyUnitRoom(id);
  } catch {
    return null;
  }
}

/**
 * Resolve the property/unit/room entity for starting an application.
 * Invite-bound IDs win over the URL param (which is often a listing-history id).
 */
export async function resolveApplicationStartEntity(
  pathEntityId: string | undefined,
  invite?: InviteLike
): Promise<ResolvedApplicationStartEntity | null> {
  const candidates = [
    invite?.roomId,
    invite?.unitId,
    invite?.propertiesId,
    pathEntityId,
  ];

  for (const candidate of candidates) {
    const found = await trySearchPropertyUnitRoom(candidate);
    if (found) {
      return finalizeResolvedEntity(found, invite);
    }
  }

  const listingId =
    invite?.propertyListingId ||
    invite?.enquires?.propertyListingId ||
    pathEntityId;

  if (!listingId) return null;

  try {
    const listing = await PropertyServices.getPropertyListingByListingId(listingId);
    if (!listing) return null;

    const fromListing =
      (await trySearchPropertyUnitRoom(listing.roomId)) ||
      (await trySearchPropertyUnitRoom(listing.unitId)) ||
      (await trySearchPropertyUnitRoom(listing.propertyId));

    if (!fromListing) return null;

    return finalizeResolvedEntity(fromListing, invite, listing.propertyId);
  } catch {
    return null;
  }
}

async function finalizeResolvedEntity(
  found: { type: string; data: { id: string; [key: string]: unknown } },
  invite?: InviteLike,
  listingPropertyId?: string | null
): Promise<ResolvedApplicationStartEntity> {
  const id = found.data.id;
  const type = found.type as 'property' | 'unit' | 'room';

  let propertyId = type === 'property' ? id : undefined;
  let unitId = type === 'unit' ? id : undefined;
  let roomId = type === 'room' ? id : undefined;

  // Always prefer invite FKs for missing parent links
  propertyId = propertyId || invite?.propertiesId || listingPropertyId || undefined;
  unitId = unitId || invite?.unitId || undefined;
  roomId = roomId || invite?.roomId || undefined;

  // Room/unit invites often omit propertiesId — recover from listing
  if (!propertyId) {
    const listingId =
      invite?.propertyListingId || invite?.enquires?.propertyListingId || null;
    if (listingId) {
      try {
        const listing = await PropertyServices.getPropertyListingByListingId(
          listingId
        );
        propertyId = listing?.propertyId || undefined;
        unitId = unitId || listing?.unitId || undefined;
        roomId = roomId || listing?.roomId || undefined;
      } catch {
        // leave undefined
      }
    }
  }

  return {
    type,
    data: found.data,
    propertyId,
    unitId,
    roomId,
  };
}
