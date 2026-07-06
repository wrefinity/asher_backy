type AdRecord = Record<string, unknown> & {
  userId?: string;
  user?: { id?: string };
};

const CREATOR_ONLY_FIELDS = [
  'views',
  'clicks',
  'reach',
  'amountPaid',
  'referenceId',
  'isListed',
  'createdAt',
  'updatedAt',
] as const;

const VIEWER_HIDDEN_FIELDS = ['startedDate', 'endDate'] as const;

export function resolveAdOwnerId(ad: AdRecord | null | undefined): string | undefined {
  if (!ad) return undefined;
  const ownerId = ad.userId ?? ad.user?.id;
  return ownerId != null ? String(ownerId) : undefined;
}

export function isAdOwner(
  ad: AdRecord | null | undefined,
  viewerUserId?: string | null
): boolean {
  if (!viewerUserId) return false;
  const ownerId = resolveAdOwnerId(ad);
  return Boolean(ownerId && ownerId === String(viewerUserId));
}

export function sanitizeAdForViewer<T extends AdRecord>(
  ad: T,
  viewerUserId?: string | null
): T {
  if (!ad || isAdOwner(ad, viewerUserId)) {
    return ad;
  }

  const sanitized = { ...ad } as T & Record<string, unknown>;
  for (const field of CREATOR_ONLY_FIELDS) {
    delete sanitized[field];
  }
  for (const field of VIEWER_HIDDEN_FIELDS) {
    delete sanitized[field];
  }
  return sanitized as T;
}

export function sanitizeAdsForViewer<T extends AdRecord>(
  ads: T[],
  viewerUserId?: string | null
): T[] {
  return ads.map((ad) => sanitizeAdForViewer(ad, viewerUserId));
}

export function sanitizePublicAdListing<T extends AdRecord>(ad: T): T {
  const sanitized = { ...ad } as T & Record<string, unknown>;
  for (const field of CREATOR_ONLY_FIELDS) {
    delete sanitized[field];
  }
  for (const field of VIEWER_HIDDEN_FIELDS) {
    delete sanitized[field];
  }
  return sanitized as T;
}

export function sanitizePublicAdListings<T extends AdRecord>(ads: T[]): T[] {
  return ads.map(sanitizePublicAdListing);
}
