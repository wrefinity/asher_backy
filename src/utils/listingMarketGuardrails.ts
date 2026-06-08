import {
  canonicalizeListingMarketCountry,
  LISTING_MARKET_COUNTRY_ALIASES,
} from './listingMarketGate';
import { getCurrencyForCountry, normalizeCurrencyCode } from './helpers';

/** Canonical tenant listing markets (property.country must resolve to one of these). */
export const SUPPORTED_LISTING_MARKET_COUNTRIES = Object.keys(
  LISTING_MARKET_COUNTRY_ALIASES
);

export type ListingMarketGuardrailResult = {
  ok: boolean;
  canonicalCountry: string | null;
  expectedCurrency: string | null;
  errors: string[];
  warnings: string[];
};

export function isSupportedListingMarketCountry(country?: string | null): boolean {
  if (!country?.trim()) return false;
  const canonical = canonicalizeListingMarketCountry(country);
  return SUPPORTED_LISTING_MARKET_COUNTRIES.includes(canonical);
}

export function expectedCurrencyForListingCountry(
  country?: string | null
): string | null {
  if (!country?.trim()) return null;
  const canonical = canonicalizeListingMarketCountry(country);
  if (!isSupportedListingMarketCountry(canonical)) return null;
  return normalizeCurrencyCode(getCurrencyForCountry(canonical));
}

export function validateListingMarketFields(
  country?: string | null,
  currency?: string | null,
  options: {
    requireCountry?: boolean;
    requireSupportedMarket?: boolean;
  } = {}
): ListingMarketGuardrailResult {
  const { requireCountry = true, requireSupportedMarket = true } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!country?.trim()) {
    if (requireCountry) {
      errors.push(
        'Property country is required. Tenant listings are only visible in supported markets (United Kingdom, Nigeria, United States, Ireland).'
      );
    }
    return {
      ok: errors.length === 0,
      canonicalCountry: null,
      expectedCurrency: null,
      errors,
      warnings,
    };
  }

  const canonicalCountry = canonicalizeListingMarketCountry(country);

  if (requireSupportedMarket && !isSupportedListingMarketCountry(canonicalCountry)) {
    errors.push(
      `Country "${country.trim()}" is not a supported tenant listing market. Choose one of: ${SUPPORTED_LISTING_MARKET_COUNTRIES.join(', ')}.`
    );
  }

  const expectedCurrency = expectedCurrencyForListingCountry(canonicalCountry);
  const normalizedCurrency = normalizeCurrencyCode(currency);

  if (expectedCurrency && normalizedCurrency && normalizedCurrency !== expectedCurrency) {
    errors.push(
      `Currency ${normalizedCurrency} does not match ${canonicalCountry} (expected ${expectedCurrency}). Listings use the property country to decide which tenants can browse them.`
    );
  }

  if (!normalizedCurrency && expectedCurrency) {
    warnings.push(`Currency will be stored as ${expectedCurrency} for ${canonicalCountry}.`);
  }

  return {
    ok: errors.length === 0,
    canonicalCountry,
    expectedCurrency,
    errors,
    warnings,
  };
}

/** Canonical country + market currency — throws when invalid or mismatched. */
export function alignPropertyListingMarketFields(
  country?: string | null,
  currency?: string | null
): { country: string; currency: string } {
  const validation = validateListingMarketFields(country, currency);
  if (!validation.ok || !validation.canonicalCountry || !validation.expectedCurrency) {
    throw new Error(validation.errors.join(' ') || 'Invalid listing market fields');
  }
  return {
    country: validation.canonicalCountry,
    currency: validation.expectedCurrency,
  };
}

/** Gate before a property (or unit/room) is published to AsherWebUser. */
export function assertPropertyEligibleForTenantListing(property: {
  country?: string | null;
  currency?: string | null;
}): void {
  const validation = validateListingMarketFields(property.country, property.currency);
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '));
  }
}
