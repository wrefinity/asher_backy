import {
  canonicalizeListingMarketCountry,
  LISTING_MARKET_COUNTRY_ALIASES,
} from './listingMarketCountries';

/** Supported tenant application markets — aligned with listing market gate. */
export type SupportedApplicationMarket =
  | 'United Kingdom'
  | 'Nigeria'
  | 'United States'
  | 'Ireland';

export interface ApplicationAddressFormConfig {
  market: SupportedApplicationMarket | 'default';
  cityLabel: string;
  cityPlaceholder: string;
  /** UI label for `state` column (County, State, etc.) */
  regionLabel: string;
  regionPlaceholder: string;
  regionRequired: boolean;
  showRegion: boolean;
  /** UI label for `zipCode` column */
  postalLabel: string;
  postalPlaceholder: string;
  postalMinLength: number;
  /** Optional regex string for client validation */
  postalPattern?: string;
}

const SUPPORTED_MARKETS = new Set<string>(
  Object.keys(LISTING_MARKET_COUNTRY_ALIASES)
);

export function resolveApplicationMarket(
  country?: string | null
): SupportedApplicationMarket | 'default' {
  if (!country?.trim()) return 'default';
  const canonical = canonicalizeListingMarketCountry(country);
  if (SUPPORTED_MARKETS.has(canonical)) {
    return canonical as SupportedApplicationMarket;
  }
  return 'default';
}

export function getApplicationAddressFormConfig(
  country?: string | null
): ApplicationAddressFormConfig {
  const market = resolveApplicationMarket(country);

  switch (market) {
    case 'United Kingdom':
      return {
        market,
        cityLabel: 'City / town',
        cityPlaceholder: 'Enter city or town',
        regionLabel: 'County',
        regionPlaceholder: 'Enter county',
        regionRequired: true,
        showRegion: true,
        postalLabel: 'Postcode',
        postalPlaceholder: 'Enter postcode',
        postalMinLength: 5,
        postalPattern:
          '^[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}$',
      };
    case 'Nigeria':
      return {
        market,
        cityLabel: 'City / town',
        cityPlaceholder: 'Enter city or town',
        regionLabel: 'State',
        regionPlaceholder: 'Select or enter state',
        regionRequired: true,
        showRegion: true,
        postalLabel: 'Postal code',
        postalPlaceholder: 'Enter postal code',
        postalMinLength: 4,
      };
    case 'United States':
      return {
        market,
        cityLabel: 'City',
        cityPlaceholder: 'Enter city',
        regionLabel: 'State',
        regionPlaceholder: 'Enter state',
        regionRequired: true,
        showRegion: true,
        postalLabel: 'ZIP code',
        postalPlaceholder: 'Enter ZIP code',
        postalMinLength: 5,
        postalPattern: '^\\d{5}(-\\d{4})?$',
      };
    case 'Ireland':
      return {
        market,
        cityLabel: 'City / town',
        cityPlaceholder: 'Enter city or town',
        regionLabel: 'County',
        regionPlaceholder: 'Enter county',
        regionRequired: true,
        showRegion: true,
        postalLabel: 'Eircode',
        postalPlaceholder: 'Enter Eircode',
        postalMinLength: 3,
      };
    default:
      return {
        market: 'default',
        cityLabel: 'City',
        cityPlaceholder: 'Enter city',
        regionLabel: 'State / province / region',
        regionPlaceholder: 'Enter state or region',
        regionRequired: true,
        showRegion: true,
        postalLabel: 'Postal / ZIP code',
        postalPlaceholder: 'Enter postal or ZIP code',
        postalMinLength: 4,
      };
  }
}

/** Stored value e.g. "3 Years" — not unit alone. */
export const RESIDENCE_DURATION_PATTERN = /^\d+\s+(Years|Months)$/i;

export function isValidResidenceDuration(value: string): boolean {
  return RESIDENCE_DURATION_PATTERN.test(value.trim());
}
