export const ALLOWED_COUNTRIES = ['United Kingdom', 'Ireland', 'Nigeria', 'United States'];

const NORMALIZE_MAP: Record<string, string> = {
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'great britain': 'United Kingdom',
  ireland: 'Ireland',
  ie: 'Ireland',
  'republic of ireland': 'Ireland',
  nigeria: 'Nigeria',
  'nigerian': 'Nigeria',
  'united states': 'United States',
  usa: 'United States',
  us: 'United States',
};

export const getCanonicalCountry = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const directMatch = ALLOWED_COUNTRIES.find(
    country => country.toLowerCase() === normalized
  );
  return NORMALIZE_MAP[normalized] || directMatch;
};

export const isAllowedCountry = (value?: string): boolean =>
  Boolean(getCanonicalCountry(value));

