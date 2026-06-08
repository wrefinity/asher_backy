import { Currency } from '@prisma/client';

/** Maximum single wallet top-up in major currency units. */
export const FUND_AMOUNT_LIMITS: Record<string, number> = {
  GBP: 50_000,
  USD: 50_000,
  EUR: 50_000,
  NGN: 50_000_000,
};

const MINOR_UNIT_CURRENCIES = new Set(['GBP', 'USD', 'EUR']);

export function normalizeMajorAmount(raw: unknown): number {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid amount provided');
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Detect amounts that look like minor units (pence/cents) stored as major units.
 * e.g. rent £2,452 entered or computed as 245200 → 2452
 */
export function coerceLikelyMinorUnitsAmount(
  amount: number,
  currency: string
): number {
  const code = currency.toUpperCase();
  if (!MINOR_UNIT_CURRENCIES.has(code)) return amount;
  if (amount < 50_000 || amount % 100 !== 0) return amount;

  const asMajor = amount / 100;
  const max = FUND_AMOUNT_LIMITS[code] ?? 50_000;
  if (asMajor >= 1 && asMajor <= max) {
    return Math.round(asMajor * 100) / 100;
  }
  return amount;
}

export function validateFundAmount(raw: unknown, currency: string): number {
  const code = (currency || 'GBP').toUpperCase();
  let amount = normalizeMajorAmount(raw);
  amount = coerceLikelyMinorUnitsAmount(amount, code);

  const max = FUND_AMOUNT_LIMITS[code] ?? 50_000;
  if (amount > max) {
    throw new Error(
      `Amount exceeds the maximum allowed top-up of ${max.toLocaleString()} ${code}`
    );
  }
  return amount;
}

export function formatMajorAmount(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function isSupportedFundCurrency(currency: string): currency is Currency {
  return Object.values(Currency).includes(currency.toUpperCase() as Currency);
}
