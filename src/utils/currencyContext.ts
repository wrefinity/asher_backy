import { Currency } from '@prisma/client';
import PreferenceService from '../services/preferences.service';
import {
  getCurrencyForCountry,
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

export function getClientIpFromRequest(req: {
  headers: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : req.ip || req.socket?.remoteAddress;
  return ip ? String(ip) : undefined;
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
  const fallback = params.defaultCurrency || Currency.NGN;
  const explicit =
    normalizeCurrencyCode(params.displayCurrency) ||
    normalizeCurrencyCode(params.currency);

  if (explicit) {
    return {
      currency: explicit,
      country: params.country?.trim() || null,
      countryCode: params.countryCode?.trim().toUpperCase() || null,
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
    return {
      currency: fromCountry,
      country: params.country?.trim() || null,
      countryCode: params.countryCode?.trim().toUpperCase() || null,
      source: 'country',
    };
  }

  const ipResolved = await resolveCurrencyFromRegion({
    country: params.country,
    countryCode: params.countryCode,
    ipAddress: params.ipAddress,
  });

  if (ipResolved.locationCurrency) {
    return {
      currency: ipResolved.locationCurrency,
      country: params.country?.trim() || null,
      countryCode: ipResolved.country_code,
      source: 'ip',
    };
  }

  return {
    currency: fallback,
    country: null,
    countryCode: null,
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

/** Currency stored on a new property when the client omits it. */
export async function resolvePropertyCreateCurrency(params: {
  currency?: string | null;
  country?: string | null;
  userId?: string | null;
}): Promise<Currency> {
  const fromBody = normalizeCurrencyCode(params.currency);
  if (fromBody) return fromBody as Currency;

  const fromCountry = getCurrencyForCountry(params.country);
  if (fromCountry) return fromCountry as Currency;

  if (params.userId) {
    const viewer = await resolveViewerCurrency({ userId: params.userId });
    if (viewer.currency) return viewer.currency as Currency;
  }

  return Currency.NGN;
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
