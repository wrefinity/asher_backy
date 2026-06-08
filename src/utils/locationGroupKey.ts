/** Slug segment for landlord location grouping keys and URL segments. */
export function slugifyLocationSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Stable group key for a state/region within a country.
 * Examples: "lagos--nigeria", "greater-london--united-kingdom", "lagos" (no country).
 */
export function buildLocationGroupKey(
  stateName: string,
  country?: string | null
): string {
  const nameKey = slugifyLocationSegment(stateName);
  if (!nameKey) return '';
  const countryKey = country?.trim() ? slugifyLocationSegment(country) : '';
  return countryKey ? `${nameKey}--${countryKey}` : nameKey;
}

export function formatLocationDisplayLabel(
  stateName: string,
  country?: string | null
): string {
  const name = stateName.trim();
  if (!name) return '';
  const countryLabel = country?.trim();
  return countryLabel ? `${name}, ${countryLabel}` : name;
}
