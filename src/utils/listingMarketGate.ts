import type { CustomRequest } from './types';
import {
  getClientIpFromRequest,
  resolveViewerCurrency,
} from './currencyContext';
import type { ListedPropertySearchFilters } from './listedPropertySearch';
import {
  getCountryNameFromCode,
  getCurrencyForCountry,
  getHomeCountryForCurrency,
} from './helpers';
import { PLATFORM_DEFAULT_CURRENCY } from '../secrets';
import {
  LISTING_MARKET_COUNTRY_ALIASES,
  canonicalizeListingMarketCountry,
} from './listingMarketCountries';

export { LISTING_MARKET_COUNTRY_ALIASES, canonicalizeListingMarketCountry };

/** Resolved context for AsherWebUser listing browse (guest + tenant). Not landlord dashboard prefs. */
export type ListingViewerContext = {
  marketCountry: string;
  /** Native currency for the active market (metadata for UI — listing prices stay in property currency). */
  displayCurrency: string;
  country: string;
  countryCode: string | null;
  source: string;
};

export function displayCurrencyForListingMarket(marketCountry: string): string {
  const canonical = canonicalizeListingMarketCountry(marketCountry);
  return (
    getCurrencyForCountry(canonical) ||
    PLATFORM_DEFAULT_CURRENCY ||
    'NGN'
  );
}

function countryCodeForMarket(marketCountry: string): string | null {
  const canonical = canonicalizeListingMarketCountry(marketCountry);
  const map: Record<string, string> = {
    'United Kingdom': 'GB',
    Nigeria: 'NG',
    'United States': 'US',
    Ireland: 'IE',
  };
  return map[canonical] || null;
}

export function resolveViewerMarketCountry(viewer: {
  country?: string | null;
  countryCode?: string | null;
  currency?: string | null;
}): string {
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

/**
 * Web listing browse SOT — geo / explicit market query only.
 * Does not read landlord account preferences (AsherLandlordFE settings).
 * Listing prices are returned in each property's native currency (no FX on browse).
 */
export async function resolveViewerMarketFromRequest(
  req: CustomRequest,
  query: Record<string, unknown> = req.query as Record<string, unknown>
) {
  const ipAddress = getClientIpFromRequest(req);

  const marketHint =
    (typeof query.marketCountry === 'string' && query.marketCountry.trim()) ||
    (typeof query.market === 'string' && query.market.trim()) ||
    (typeof query.country === 'string' && query.country.trim()) ||
    undefined;

  const countryCodeHint =
    typeof query.countryCode === 'string' ? query.countryCode : undefined;

  // Never pass userId, currency, or displayCurrency — those are landlord/dashboard concerns.
  const geoContext = await resolveViewerCurrency({
    country: marketHint,
    countryCode: countryCodeHint,
    ipAddress,
  });

  const marketCountry = resolveViewerMarketCountry({
    country: marketHint || geoContext.country,
    countryCode: countryCodeHint || geoContext.countryCode,
    currency: geoContext.currency,
  });

  const displayCurrency = displayCurrencyForListingMarket(marketCountry);
  const countryCode =
    countryCodeHint?.trim().toUpperCase() ||
    geoContext.countryCode ||
    countryCodeForMarket(marketCountry);

  const viewerContext: ListingViewerContext = {
    marketCountry,
    displayCurrency,
    country: marketCountry,
    countryCode,
    source: marketHint ? 'query' : geoContext.source,
  };

  return {
    ipAddress,
    viewerContext,
    marketCountry,
  };
}
