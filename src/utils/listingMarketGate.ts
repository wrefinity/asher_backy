import type { CustomRequest } from './types';
import type { ViewerCurrencyContext } from './currencyContext';
import {
  getClientIpFromRequest,
  resolveViewerCurrency,
} from './currencyContext';
import type { ListedPropertySearchFilters } from './listedPropertySearch';
import {
  getCountryNameFromCode,
  getHomeCountryForCurrency,
} from './helpers';

/** Canonical market → DB `properties.country` values we accept. */
export const LISTING_MARKET_COUNTRY_ALIASES: Record<string, string[]> = {
  'United Kingdom': [
    'United Kingdom',
    'UK',
    'Great Britain',
    'England',
    'Scotland',
    'Wales',
    'Northern Ireland',
  ],
  Nigeria: ['Nigeria'],
  'United States': [
    'United States',
    'USA',
    'United States of America',
    'US',
  ],
  Ireland: ['Ireland', 'Republic of Ireland'],
};

export function canonicalizeListingMarketCountry(raw: string): string {
  const normalized = raw.trim();
  for (const [canonical, aliases] of Object.entries(LISTING_MARKET_COUNTRY_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === normalized.toLowerCase())) {
      return canonical;
    }
  }
  return normalized;
}

export function resolveViewerMarketCountry(viewer: ViewerCurrencyContext): string {
  if (viewer.country?.trim()) {
    return canonicalizeListingMarketCountry(viewer.country);
  }

  const fromCode = getCountryNameFromCode(viewer.countryCode);
  if (fromCode) {
    return canonicalizeListingMarketCountry(fromCode);
  }

  const fromCurrency = getHomeCountryForCurrency(viewer.currency);
  if (fromCurrency) {
    return canonicalizeListingMarketCountry(fromCurrency);
  }

  return 'Nigeria';
}

export function propertyCountryMatchesMarket(
  propertyCountry: string | null | undefined,
  marketCountry: string
): boolean {
  if (!propertyCountry?.trim()) {
    return false;
  }
  return (
    canonicalizeListingMarketCountry(propertyCountry).toLowerCase() ===
    marketCountry.toLowerCase()
  );
}

/**
 * Tenant/guest listing browse is gated to the viewer's market country.
 * Landlords may create properties anywhere; visibility is by property.country only.
 */
export function applyListingMarketGateToFilters(
  filters: ListedPropertySearchFilters,
  marketCountry: string
): ListedPropertySearchFilters {
  const next: ListedPropertySearchFilters = {
    ...filters,
    marketCountry,
  };

  if (next.property) {
    const { country: _removed, ...propertyRest } = next.property;
    next.property = Object.keys(propertyRest).length > 0 ? propertyRest : undefined;
  }

  return next;
}

export async function resolveViewerMarketFromRequest(
  req: CustomRequest,
  query: Record<string, unknown> = req.query as Record<string, unknown>
) {
  const ipAddress = getClientIpFromRequest(req);
  const viewerContext = await resolveViewerCurrency({
    userId: req.user?.id,
    currency: query.currency as string | undefined,
    displayCurrency: query.displayCurrency as string | undefined,
    countryCode: query.countryCode as string | undefined,
    country: query.country as string | undefined,
    ipAddress,
  });

  const marketCountry = resolveViewerMarketCountry(viewerContext);

  return {
    ipAddress,
    viewerContext: {
      ...viewerContext,
      country: viewerContext.country || marketCountry,
    },
    marketCountry,
  };
}
