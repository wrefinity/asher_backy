import { Currency } from '@prisma/client';
import PreferenceService from '../services/preferences.service';
import { PLATFORM_DEFAULT_CURRENCY } from '../secrets';
import {
  getCurrencyForCountry,
  getCountryNameFromCode,
  getHomeCountryForCurrency,
  normalizeCurrencyCode,
  resolveCurrencyFromRegion,
} from './helpers';

export type ViewerCurrencySource = 'query' | 'preferences' | 'country' | 'ip' | 'default';

export type ViewerCurrencyContext = {
  currency: string;
  country: string | null;
  countryCode: string | null;
  source: ViewerCurrencySource;
};

export function normalizeClientIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  const trimmed = String(ip).trim();
  if (!trimmed) return undefined;
  if (
    trimmed === '::1' ||
    trimmed === '127.0.0.1' ||
    trimmed === '::ffff:127.0.0.1'
  ) {
    return '127.0.0.1';
  }
  return trimmed.replace(/^::ffff:/, '');
}

export function getClientIpFromRequest(req: {
  headers: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : req.ip || req.socket?.remoteAddress;
  return normalizeClientIp(raw);
}

/**
 * Resolves the currency (and related country hints) used for display across web and mobile.
 * Priority: explicit query → saved preferences → country hint → IP → platform default.
 */
export async function resolveViewerCurrency(params: {
  userId?: string | null;
  currency?: string | null;
  displayCurrency?: string | null;
  country?: string | null;
  countryCode?: string | null;
  ipAddress?: string | null;
  defaultCurrency?: Currency;
}): Promise<ViewerCurrencyContext> {
  const fallback =
    params.defaultCurrency ||
    (PLATFORM_DEFAULT_CURRENCY as Currency) ||
    Currency.NGN;
  const explicit =
    normalizeCurrencyCode(params.displayCurrency) ||
    normalizeCurrencyCode(params.currency);

  if (explicit) {
    const countryCode = params.countryCode?.trim().toUpperCase() || null;
    const country =
      params.country?.trim() ||
      getCountryNameFromCode(countryCode) ||
      getHomeCountryForCurrency(explicit) ||
      null;

    return {
      currency: explicit,
      country,
      countryCode,
      source: 'query',
    };
  }

  if (params.userId) {
    const prefs = await PreferenceService.getUserPreferences(params.userId);
    const prefCountry = prefs?.region?.trim() || null;
    const prefCurrency = normalizeCurrencyCode(prefs?.currency ? String(prefs.currency) : null);

    if (prefCurrency) {
      return {
        currency: prefCurrency,
        country: prefCountry,
        countryCode: null,
        source: 'preferences',
      };
    }

    if (prefCountry) {
      const fromPrefCountry = getCurrencyForCountry(prefCountry);
      if (fromPrefCountry) {
        return {
          currency: fromPrefCountry,
          country: prefCountry,
          countryCode: null,
          source: 'preferences',
        };
      }
    }
  }

  const fromCountry =
    getCurrencyForCountry(params.countryCode) ||
    getCurrencyForCountry(params.country);

  if (fromCountry) {
    const countryCode = params.countryCode?.trim().toUpperCase() || null;
    const country =
      params.country?.trim() ||
      getCountryNameFromCode(countryCode) ||
      getHomeCountryForCurrency(fromCountry) ||
      null;

    return {
      currency: fromCountry,
      country,
      countryCode,
      source: 'country',
    };
  }

  const ipResolved = await resolveCurrencyFromRegion({
    country: params.country,
    countryCode: params.countryCode,
    ipAddress: params.ipAddress,
  });

  if (ipResolved.locationCurrency) {
    const countryCode = ipResolved.country_code || params.countryCode?.trim().toUpperCase() || null;
    const country =
      params.country?.trim() ||
      getCountryNameFromCode(countryCode) ||
      getHomeCountryForCurrency(ipResolved.locationCurrency) ||
      null;

    return {
      currency: ipResolved.locationCurrency,
      country,
      countryCode,
      source: 'ip',
    };
  }

  const fallbackCountry = getHomeCountryForCurrency(fallback);

  return {
    currency: fallback,
    country: fallbackCountry,
    countryCode: fallbackCountry === 'United Kingdom' ? 'GB' : fallbackCountry === 'Nigeria' ? 'NG' : null,
    source: 'default',
  };
}

export function buildCurrencyDisplayOptions(
  viewer: ViewerCurrencyContext,
  ipAddress?: string
) {
  return {
    currency: viewer.currency,
    country: viewer.country || undefined,
    countryCode: viewer.countryCode || undefined,
    ipAddress,
  };
}

/** Web listing browse — keep each listing in its property currency (no FX conversion). */
export function buildListingBrowseCurrencyOptions() {
  return {
    currency: null as string | null,
    country: null as string | null,
    countryCode: null as string | null,
    ipAddress: null as string | null,
  };
}

/** Currency stored on a new property when the client omits it. */
export async function resolvePropertyCreateCurrency(params: {
  currency?: string | null;
  country?: string | null;
  userId?: string | null;
}): Promise<Currency> {
  const fromCountry = getCurrencyForCountry(params.country);
  if (fromCountry) return fromCountry as Currency;

  const fromBody = normalizeCurrencyCode(params.currency);
  if (fromBody) return fromBody as Currency;

  if (params.userId) {
    const viewer = await resolveViewerCurrency({ userId: params.userId });
    if (viewer.currency) return viewer.currency as Currency;
  }

  return (PLATFORM_DEFAULT_CURRENCY as Currency) || Currency.NGN;
}

export function formatPreferencesResponse<T extends Record<string, unknown> | null>(
  preferences: T
): T & { country?: string | null } {
  if (!preferences) return preferences as T & { country?: string | null };
  return {
    ...preferences,
    country: (preferences.region as string) || null,
  };
}

/** Legacy shape for existing call sites — delegates to resolveViewerCurrency. */
export async function getCurrentCountryCurrency(
  ipAddress?: string | null,
  userId?: string | null
) {
  const viewer = await resolveViewerCurrency({ userId, ipAddress });
  return {
    country_code: viewer.countryCode,
    locationCurrency: viewer.currency,
  };
}
