/** Canonical market → DB `properties.country` values we accept. No upstream imports. */
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
