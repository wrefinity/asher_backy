import { resolveApplicationMarket } from './applicationAddressFields';
import type { ApplicationFormConfig, ApplicationFormConfigDraft } from './applicationFormConfig';

export interface TenancyHistoryMarketRules {
  marketLabel: string;
  /** Suggested default when landlord has not configured a value. */
  defaultYears: number;
  minYears: number;
  maxYears: number;
  /** Shown on landlord global settings page. */
  landlordHelp: string;
  /** Shown to applicants on the residential step. */
  applicantHelpTemplate: string;
}

const RULES: Record<string, TenancyHistoryMarketRules> = {
  'United Kingdom': {
    marketLabel: 'United Kingdom',
    defaultYears: 3,
    minYears: 0,
    maxYears: 10,
    landlordHelp:
      'UK referencing typically expects up to 3 years of address history. Set how many years applicants must cover across their current and previous addresses.',
    applicantHelpTemplate:
      'Your landlord requires at least {years} years of address history (current address plus any previous addresses).',
  },
  Nigeria: {
    marketLabel: 'Nigeria',
    defaultYears: 1,
    minYears: 0,
    maxYears: 5,
    landlordHelp:
      'Set the minimum years of residential history applicants must provide. One year is common for local referencing.',
    applicantHelpTemplate:
      'Please provide at least {years} year(s) of address history across your current and previous addresses.',
  },
  'United States': {
    marketLabel: 'United States',
    defaultYears: 2,
    minYears: 0,
    maxYears: 7,
    landlordHelp:
      'Many US landlords request 2 years of rental history. Set the minimum total address history required from applicants.',
    applicantHelpTemplate:
      'Your landlord requires at least {years} years of address/rental history (current and previous addresses combined).',
  },
  Ireland: {
    marketLabel: 'Ireland',
    defaultYears: 3,
    minYears: 0,
    maxYears: 10,
    landlordHelp:
      'Irish referencing often expects several years of address history. Set the minimum years applicants must cover.',
    applicantHelpTemplate:
      'Your landlord requires at least {years} years of address history (current address plus previous addresses).',
  },
};

const DEFAULT_RULES: TenancyHistoryMarketRules = {
  marketLabel: 'General',
  defaultYears: 2,
  minYears: 0,
  maxYears: 10,
  landlordHelp:
    'Set the minimum years of address history applicants must provide across current and previous addresses.',
  applicantHelpTemplate:
    'Please provide at least {years} years of address history across your current and previous addresses.',
};

export function getTenancyHistoryMarketRules(
  country?: string | null
): TenancyHistoryMarketRules {
  const market = resolveApplicationMarket(country);
  return RULES[market] ?? DEFAULT_RULES;
}

export function resolveMinimumTenancyHistoryYears(
  landlordSetting: number | null | undefined,
  country?: string | null
): number {
  const rules = getTenancyHistoryMarketRules(country);
  if (
    landlordSetting != null &&
    !Number.isNaN(landlordSetting) &&
    landlordSetting >= 0
  ) {
    return Math.min(Math.max(Math.round(landlordSetting), rules.minYears), rules.maxYears);
  }
  return rules.defaultYears;
}

export function formatTenancyHistoryHelp(
  years: number,
  country?: string | null
): string {
  const rules = getTenancyHistoryMarketRules(country);
  return rules.applicantHelpTemplate.replace('{years}', String(years));
}

export function applyTenancyHistoryMinimumToFormConfig(
  config: ApplicationFormConfigDraft,
  minimumYears: number,
  country?: string | null
): ApplicationFormConfig {
  return {
    ...config,
    residential: {
      ...config.residential,
      minimumTenancyHistoryYears: minimumYears,
      minimumTenancyHistoryHelp: formatTenancyHistoryHelp(minimumYears, country),
    },
  };
}

export function parseLengthOfResidenceToYears(value?: string | null): number {
  if (!value?.trim()) return 0;
  const match = value.trim().match(/^(\d+)\s*(Years|Months)$/i);
  if (!match) {
    const digits = value.match(/^(\d+)$/);
    return digits ? Number(digits[1]) : 0;
  }
  const amount = Number(match[1]);
  if (Number.isNaN(amount) || amount < 0) return 0;
  return match[2].toLowerCase() === 'months' ? amount / 12 : amount;
}

export function calculateTotalResidenceYears(input: {
  lengthOfResidence?: string | null;
  lengthOfResidenceAmount?: string | null;
  lengthOfResidenceUnit?: string | null;
  prevAddresses?: Array<{
    lengthOfResidence?: string | null;
    lengthOfResidenceAmount?: string | null;
    lengthOfResidenceUnit?: string | null;
  }>;
}): number {
  let total = 0;

  if (input.lengthOfResidenceAmount && input.lengthOfResidenceUnit) {
    total += parseLengthOfResidenceToYears(
      `${input.lengthOfResidenceAmount} ${input.lengthOfResidenceUnit}`
    );
  } else {
    total += parseLengthOfResidenceToYears(input.lengthOfResidence);
  }

  for (const prev of input.prevAddresses ?? []) {
    if (prev.lengthOfResidenceAmount && prev.lengthOfResidenceUnit) {
      total += parseLengthOfResidenceToYears(
        `${prev.lengthOfResidenceAmount} ${prev.lengthOfResidenceUnit}`
      );
    } else {
      total += parseLengthOfResidenceToYears(prev.lengthOfResidence);
    }
  }

  return Math.round(total * 100) / 100;
}

export function validateTenancyHistoryCoverage(
  input: Parameters<typeof calculateTotalResidenceYears>[0],
  minimumYears: number
): { valid: boolean; totalYears: number; message?: string } {
  if (!minimumYears || minimumYears <= 0) {
    return { valid: true, totalYears: calculateTotalResidenceYears(input) };
  }

  const totalYears = calculateTotalResidenceYears(input);
  if (totalYears >= minimumYears) {
    return { valid: true, totalYears };
  }

  const shortfall = Math.ceil((minimumYears - totalYears) * 10) / 10;
  return {
    valid: false,
    totalYears,
    message: `You need at least ${minimumYears} years of address history in total. You have ${totalYears} year(s) — add about ${shortfall} more year(s) via previous addresses.`,
  };
}

export function validateLandlordTenancyMinimumSetting(
  value: number | null | undefined,
  country?: string | null
): string | null {
  if (value == null || value === ('' as unknown)) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return 'Enter a valid number of years';
  const rules = getTenancyHistoryMarketRules(country);
  if (n < rules.minYears || n > rules.maxYears) {
    return `Minimum tenancy history must be between ${rules.minYears} and ${rules.maxYears} years for ${rules.marketLabel}`;
  }
  return null;
}
