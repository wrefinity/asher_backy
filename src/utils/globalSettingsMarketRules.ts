import { FrequencyType } from '@prisma/client';

export type GlobalSettingsMarketDefaults = {
  refundPartialPercentage: number;
  leaseRenewalReminderFirst: number;
  leaseRenewalReminderSecond: number;
  leaseRenewalReminderFinal: number;
  holdingDepositMaxWeeks: number | null;
  rentIncreaseNoticeDays: number | null;
  defaultRentCollectionFrequency: FrequencyType;
  lateFeeMaxPercent: number | null;
  depositReturnTimeframe: FrequencyType;
  inspectionNoticeHours: number;
  rentReminderLeadPercent: number;
  billReminderLeadPercent: number;
};

const UK_DEFAULTS: GlobalSettingsMarketDefaults = {
  refundPartialPercentage: 50,
  leaseRenewalReminderFirst: 50,
  leaseRenewalReminderSecond: 25,
  leaseRenewalReminderFinal: 10,
  holdingDepositMaxWeeks: 1,
  rentIncreaseNoticeDays: 60,
  defaultRentCollectionFrequency: FrequencyType.MONTHLY,
  lateFeeMaxPercent: 3,
  depositReturnTimeframe: FrequencyType.MONTHLY,
  inspectionNoticeHours: 24,
  rentReminderLeadPercent: 25,
  billReminderLeadPercent: 20,
};

const NG_DEFAULTS: GlobalSettingsMarketDefaults = {
  refundPartialPercentage: 50,
  leaseRenewalReminderFirst: 50,
  leaseRenewalReminderSecond: 30,
  leaseRenewalReminderFinal: 15,
  holdingDepositMaxWeeks: null,
  rentIncreaseNoticeDays: 30,
  defaultRentCollectionFrequency: FrequencyType.YEARLY,
  lateFeeMaxPercent: null,
  depositReturnTimeframe: FrequencyType.MONTHLY,
  inspectionNoticeHours: 24,
  rentReminderLeadPercent: 20,
  billReminderLeadPercent: 15,
};

const US_DEFAULTS: GlobalSettingsMarketDefaults = {
  refundPartialPercentage: 50,
  leaseRenewalReminderFirst: 50,
  leaseRenewalReminderSecond: 25,
  leaseRenewalReminderFinal: 10,
  holdingDepositMaxWeeks: null,
  rentIncreaseNoticeDays: 30,
  defaultRentCollectionFrequency: FrequencyType.MONTHLY,
  lateFeeMaxPercent: null,
  depositReturnTimeframe: FrequencyType.MONTHLY,
  inspectionNoticeHours: 24,
  rentReminderLeadPercent: 25,
  billReminderLeadPercent: 20,
};

const GENERAL_DEFAULTS = US_DEFAULTS;

function normalizeCountry(country?: string | null): string {
  return (country ?? '').trim().toLowerCase();
}

export function resolveGlobalSettingsMarketDefaults(
  country?: string | null
): GlobalSettingsMarketDefaults {
  const c = normalizeCountry(country);
  if (c.includes('united kingdom') || c === 'uk' || c === 'gb') return UK_DEFAULTS;
  if (c.includes('nigeria') || c === 'ng') return NG_DEFAULTS;
  if (c.includes('united states') || c === 'us' || c === 'usa') return US_DEFAULTS;
  if (c.includes('ireland') || c === 'ie') return { ...UK_DEFAULTS, holdingDepositMaxWeeks: null };
  return GENERAL_DEFAULTS;
}

/** Max application fee % of one rent period from holding deposit week cap. */
export function maxApplicationFeePercentForHoldingCap(
  holdingDepositMaxWeeks: number | null | undefined,
  rentCollectionFrequency: FrequencyType | null | undefined
): number | null {
  if (holdingDepositMaxWeeks == null || holdingDepositMaxWeeks <= 0) return null;
  const weeksPerPeriod: Record<FrequencyType, number> = {
    DAILY: 1 / 7,
    WEEKLY: 1,
    MONTHLY: 4.33,
    QUARTERLY: 13,
    YEARLY: 52,
  };
  const freq = rentCollectionFrequency ?? FrequencyType.MONTHLY;
  const periodWeeks = weeksPerPeriod[freq] ?? 4.33;
  return Math.min(100, Math.round((holdingDepositMaxWeeks / periodWeeks) * 100 * 100) / 100);
}

export function validateGlobalSettingsForMarket(
  payload: Record<string, unknown>,
  country?: string | null
): string | null {
  const defaults = resolveGlobalSettingsMarketDefaults(country);

  if (payload.refundPolicy === 'PARTIAL') {
    const pct = Number(payload.refundPartialPercentage);
    if (Number.isNaN(pct) || pct < 1 || pct > 100) {
      return 'Partial refund percentage must be between 1 and 100.';
    }
  }

  const holdingMax = payload.holdingDepositMaxWeeks ?? defaults.holdingDepositMaxWeeks;
  const appFee = Number(payload.applicationFeePercentage);
  const rentFreq =
    (payload.defaultRentCollectionFrequency as FrequencyType) ??
    defaults.defaultRentCollectionFrequency;
  const cap = maxApplicationFeePercentForHoldingCap(
    holdingMax as number | null,
    rentFreq
  );
  if (cap != null && !Number.isNaN(appFee) && appFee > cap) {
    return `Application fee cannot exceed ${cap}% of one rent period for your holding deposit cap (${holdingMax} week(s)).`;
  }

  const lateFee = Number(payload.lateFeePercentage);
  const lateMax = Number(payload.lateFeeMaxPercent ?? defaults.lateFeeMaxPercent);
  if (
    defaults.lateFeeMaxPercent != null &&
    !Number.isNaN(lateFee) &&
    !Number.isNaN(lateMax) &&
    lateFee > lateMax
  ) {
    return `Late fee cannot exceed ${lateMax}% in your market.`;
  }

  const dueDay = payload.defaultRentDueDay;
  if (dueDay != null && dueDay !== '') {
    const d = Number(dueDay);
    if (Number.isNaN(d) || d < 1 || d > 28) {
      return 'Default rent due day must be between 1 and 28.';
    }
  }

  return null;
}

export function getLeaseRenewalThresholds(settings: {
  leaseRenewalReminderFirst?: number | null;
  leaseRenewalReminderSecond?: number | null;
  leaseRenewalReminderFinal?: number | null;
} | null | undefined, country?: string | null) {
  const defaults = resolveGlobalSettingsMarketDefaults(country);
  return {
    first: settings?.leaseRenewalReminderFirst ?? defaults.leaseRenewalReminderFirst,
    second: settings?.leaseRenewalReminderSecond ?? defaults.leaseRenewalReminderSecond,
    final: settings?.leaseRenewalReminderFinal ?? defaults.leaseRenewalReminderFinal,
  };
}
