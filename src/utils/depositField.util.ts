/** Country-aware deposit field helpers (display labels + CSV/form normalization). */

function normalizeCountry(country?: string | null): string {
  return (country || '').trim().toLowerCase();
}

export function isNigeriaCountry(country?: string | null): boolean {
  return normalizeCountry(country) === 'nigeria';
}

export function isUkCountry(country?: string | null): boolean {
  return /^(united kingdom|uk|gb|england|scotland|wales|northern ireland|great britain)$/.test(
    normalizeCountry(country)
  );
}

/** User-facing deposit label by property country. */
export function getDepositLabel(country?: string | null): string {
  if (isNigeriaCountry(country)) return 'Initial deposit';
  if (isUkCountry(country)) return 'Deposit';
  return 'Security deposit';
}

export function parseDepositValue(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

type DepositRow = {
  country?: string;
  securityDeposit?: unknown;
  initialDeposit?: unknown;
  deposit?: unknown;
};

/**
 * Merge country-specific deposit CSV/form columns into one amount for storage.
 * Nigeria prefers initialDeposit; UK and others prefer securityDeposit / Deposit column.
 */
export function resolvePropertyDepositForStorage(row: DepositRow): number | undefined {
  const sec = parseDepositValue(row.securityDeposit ?? row.deposit);
  const init = parseDepositValue(row.initialDeposit);

  if (isNigeriaCountry(row.country)) {
    return init ?? sec;
  }

  return sec ?? init;
}
