import { prismaClient } from '..';
import { extractLandlord, type NormalizedLandlord } from './landlordExtractor';

export type UserPrivacyPrefs = {
  showBasicProfile: boolean;
  showContactDetails: boolean;
};

const DEFAULT_PRIVACY: UserPrivacyPrefs = {
  showBasicProfile: true,
  showContactDetails: false,
};

export async function getUserPrivacyPrefs(
  userId?: string | null
): Promise<UserPrivacyPrefs> {
  if (!userId) return DEFAULT_PRIVACY;

  const prefs = await prismaClient.userPreferences.findUnique({
    where: { userId },
    select: { showBasicProfile: true, showContactDetails: true },
  });

  return {
    showBasicProfile: prefs?.showBasicProfile ?? DEFAULT_PRIVACY.showBasicProfile,
    showContactDetails: prefs?.showContactDetails ?? DEFAULT_PRIVACY.showContactDetails,
  };
}

export async function getUserPrivacyPrefsBatch(
  userIds: string[]
): Promise<Map<string, UserPrivacyPrefs>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, UserPrivacyPrefs>();

  if (unique.length === 0) return map;

  const rows = await prismaClient.userPreferences.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, showBasicProfile: true, showContactDetails: true },
  });

  for (const id of unique) {
    map.set(id, DEFAULT_PRIVACY);
  }
  for (const row of rows) {
    map.set(row.userId, {
      showBasicProfile: row.showBasicProfile ?? true,
      showContactDetails: row.showContactDetails ?? false,
    });
  }

  return map;
}

export function sanitizeProfileFields(
  profile: Record<string, unknown> | null | undefined,
  prefs: UserPrivacyPrefs
): Record<string, unknown> | null | undefined {
  if (!profile) return profile;

  if (!prefs.showBasicProfile) {
    return {
      profileUrl: profile.profileUrl ?? null,
      fullname: profile.fullname ?? profile.firstName ?? 'Landlord',
      firstName: profile.firstName ?? null,
      lastName: null,
    };
  }

  if (!prefs.showContactDetails) {
    return {
      ...profile,
      phoneNumber: null,
      address: null,
      city: null,
      zip: null,
      taxPayerId: null,
    };
  }

  return profile;
}

export function sanitizeUserForViewer<
  T extends Record<string, unknown> & {
    id?: string;
    email?: unknown;
    profile?: Record<string, unknown> | null;
  },
>(
  user: T | null | undefined,
  viewerId: string | undefined,
  prefs: UserPrivacyPrefs
): T | null | undefined {
  if (!user) return user;
  if (viewerId && user.id === viewerId) return user;

  const sanitized = { ...user };

  if (!prefs.showContactDetails) {
    sanitized.email = null;
  }

  if (user.profile) {
    sanitized.profile = sanitizeProfileFields(user.profile, prefs);
  }

  return sanitized;
}

export function sanitizeLandlordForPublicView(
  landlord: NormalizedLandlord | null | undefined,
  prefs: UserPrivacyPrefs
): NormalizedLandlord | null | undefined {
  if (!landlord) return landlord;

  const user = { ...landlord.user };
  if (!prefs.showContactDetails) {
    user.email = '';
  }

  const profile = sanitizeProfileFields(
    user.profile as Record<string, unknown>,
    prefs
  );

  return {
    ...landlord,
    user: {
      ...user,
      profile: {
        fullname: String(profile?.fullname ?? user.profile?.fullname ?? ''),
        firstName: String(profile?.firstName ?? user.profile?.firstName ?? ''),
        lastName: String(profile?.lastName ?? user.profile?.lastName ?? ''),
        profileUrl: (profile?.profileUrl as string | null) ?? user.profile?.profileUrl ?? null,
      },
    },
  };
}

/** Sanitize a raw landlord block for a specific viewer (applicant/tenant flows). */
export async function sanitizeLandlordBlockForViewer(
  landlord: unknown,
  viewerId?: string | null
): Promise<NormalizedLandlord> {
  const extracted = extractLandlord(landlord);
  const landlordUserId = extracted.userId || extracted.user?.id;
  if (!landlordUserId) return extracted;
  if (viewerId && viewerId === landlordUserId) return extracted;

  const prefs = await getUserPrivacyPrefs(landlordUserId);
  return sanitizeLandlordForPublicView(extracted, prefs)!;
}

export async function sanitizeLandlordInProperty<T extends { landlord?: unknown }>(
  property: T | null | undefined,
  viewerId?: string | null
): Promise<T | null | undefined> {
  if (!property?.landlord) return property;
  const landlord = await sanitizeLandlordBlockForViewer(property.landlord, viewerId);
  return { ...property, landlord };
}

export async function sanitizeListingLandlordsForPublicView<
  T extends { property?: { landlord?: NormalizedLandlord | null } },
>(listings: T[]): Promise<T[]> {
  const userIds = listings
    .map(l => l.property?.landlord?.userId || l.property?.landlord?.user?.id)
    .filter((id): id is string => Boolean(id));

  const prefsMap = await getUserPrivacyPrefsBatch(userIds);

  return listings.map(listing => {
    const landlord = listing.property?.landlord;
    if (!listing.property || !landlord) return listing;

    const userId = landlord.userId || landlord.user?.id;
    const prefs = prefsMap.get(userId || '') || DEFAULT_PRIVACY;

    return {
      ...listing,
      property: {
        ...listing.property,
        landlord: sanitizeLandlordForPublicView(landlord, prefs),
      },
    };
  });
}
