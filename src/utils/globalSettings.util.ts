import {
  FrequencyType,
  LatePaymentFeeType,
  PriceFrequency,
  RefundPolicyType,
} from '@prisma/client';
import type { IGlobalSetting } from '../landlord/validations/interfaces/propsSettings';

/** Days in one billing cycle — single source for period-based % calculations. */
export const PERIOD_DAYS: Record<PriceFrequency, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  ANNUALLY: 365,
  PER_SQFT: 30,
};

const FREQUENCY_TYPE_DAYS: Record<FrequencyType, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

export function periodDaysForFrequency(freq?: PriceFrequency | null): number {
  if (!freq) return PERIOD_DAYS.MONTHLY;
  return PERIOD_DAYS[freq] ?? PERIOD_DAYS.MONTHLY;
}

export function daysForFrequencyType(freq?: FrequencyType | null): number {
  if (!freq) return FREQUENCY_TYPE_DAYS.MONTHLY;
  return FREQUENCY_TYPE_DAYS[freq] ?? FREQUENCY_TYPE_DAYS.MONTHLY;
}

export function amountFromRentPercent(rent: number, percent?: number | null): number {
  if (!rent || percent == null || percent <= 0) return 0;
  return rent * (percent / 100);
}

/** Converts a % of the billing period into whole days (min 0). */
export function daysFromPeriodPercent(
  periodPercent?: number | null,
  freq?: PriceFrequency | null
): number {
  if (periodPercent == null || periodPercent <= 0) return 0;
  return Math.round(periodDaysForFrequency(freq) * (periodPercent / 100));
}

export type ResolvedFinancialRules = {
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
  lateFeePercent: number;
  lateFeeFixed: number;
  lateFeeFrequency: FrequencyType | null;
  graceDays: number;
  depositAmount: number;
  depositPercent: number;
  applicationFeeAmount: number;
  applicationFeePercent: number;
  refundPolicy: RefundPolicyType | null;
  refundTimeframe: FrequencyType | null;
  refundTimeframeDays: number;
  notificationEnabled: boolean;
  reminderIntervalDays: number;
  reminderMethods: string[];
};

export type PropertyFinancialOverride = {
  lateFeeEnabled?: boolean;
  lateFeePercent?: number | null;
  lateFeeFixed?: number | null;
  graceDays?: number | null;
  lateFeeFrequency?: FrequencyType | null;
};

export function parseGracePeriodDays(value?: string | number | null): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value);
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(Number(match[1])) : null;
}

export function mapToPropertyLateFeeFrequency(
  freq?: FrequencyType | null
): LatePaymentFeeType {
  if (freq === FrequencyType.DAILY) return LatePaymentFeeType.DAILY;
  if (freq === FrequencyType.WEEKLY) return LatePaymentFeeType.WEEKLY;
  return LatePaymentFeeType.ONE_TIME;
}

export function mapFromPropertyLateFeeFrequency(
  freq?: LatePaymentFeeType | null
): FrequencyType | null {
  if (freq === LatePaymentFeeType.DAILY) return FrequencyType.DAILY;
  if (freq === LatePaymentFeeType.WEEKLY) return FrequencyType.WEEKLY;
  if (freq === LatePaymentFeeType.ONE_TIME) return FrequencyType.MONTHLY;
  return null;
}

export function resolveFinancialRules(
  settings: Partial<IGlobalSetting> | null | undefined,
  rent: number,
  frequency?: PriceFrequency | null
): ResolvedFinancialRules {
  const lateFeePercent = settings?.lateFeePercentage ?? 0;
  const depositPercent = settings?.depositPercentage ?? 0;
  const applicationFeePercent = settings?.applicationFeePercentage ?? 0;
  const refundTimeframe = settings?.refundTimeframe ?? null;

  return {
    lateFeeEnabled: settings?.lateFeeEnabled ?? false,
    lateFeeAmount: amountFromRentPercent(rent, lateFeePercent),
    lateFeePercent,
    lateFeeFixed: 0,
    lateFeeFrequency: settings?.lateFeeFrequency ?? null,
    graceDays: daysFromPeriodPercent(settings?.lateFeeGracePeriod, frequency),
    depositAmount: amountFromRentPercent(rent, depositPercent),
    depositPercent,
    applicationFeeAmount: amountFromRentPercent(rent, applicationFeePercent),
    applicationFeePercent,
    refundPolicy: settings?.refundPolicy ?? null,
    refundTimeframe,
    refundTimeframeDays: daysForFrequencyType(refundTimeframe),
    notificationEnabled: settings?.notificationEnabled ?? false,
    reminderIntervalDays: daysFromPeriodPercent(settings?.notificationFrequency, frequency),
    reminderMethods: settings?.reminderMethods ?? [],
  };
}

export function mergeFinancialRules(
  base: ResolvedFinancialRules,
  override?: PropertyFinancialOverride | null
): ResolvedFinancialRules {
  if (!override) return base;

  const lateFeePercent =
    override.lateFeePercent != null ? override.lateFeePercent : base.lateFeePercent;
  const lateFeeFixed =
    override.lateFeeFixed != null ? override.lateFeeFixed : base.lateFeeFixed;

  return {
    ...base,
    lateFeeEnabled: override.lateFeeEnabled ?? base.lateFeeEnabled,
    lateFeePercent,
    lateFeeFixed,
    lateFeeAmount: lateFeeFixed > 0 ? lateFeeFixed : base.lateFeeAmount,
    lateFeeFrequency: override.lateFeeFrequency ?? base.lateFeeFrequency,
    graceDays: override.graceDays ?? base.graceDays,
  };
}

export function propertySettingsToOverride(record: {
  lateFee?: { toNumber?: () => number } | number | null;
  lateFeePercentage?: number | null;
  gracePeriodDays?: number | null;
  lateFeeFrequency?: LatePaymentFeeType | null;
} | null): PropertyFinancialOverride | null {
  if (!record) return null;

  const fixed =
    record.lateFee != null
      ? typeof record.lateFee === 'number'
        ? record.lateFee
        : record.lateFee.toNumber?.() ?? Number(record.lateFee)
      : 0;

  return {
    lateFeeEnabled: (record.lateFeePercentage ?? 0) > 0 || fixed > 0,
    lateFeePercent: record.lateFeePercentage ?? null,
    lateFeeFixed: fixed > 0 ? fixed : null,
    graceDays: record.gracePeriodDays ?? null,
    lateFeeFrequency: mapFromPropertyLateFeeFrequency(record.lateFeeFrequency),
  };
}

/** Number of billing periods overdue after grace — used with lateFeeFrequency. */
export function overduePeriodsAfterGrace(
  daysAfterGrace: number,
  frequency?: FrequencyType | null
): number {
  if (daysAfterGrace <= 0) return 0;
  switch (frequency ?? FrequencyType.MONTHLY) {
    case FrequencyType.DAILY:
      return daysAfterGrace;
    case FrequencyType.WEEKLY:
      return Math.max(1, Math.ceil(daysAfterGrace / 7));
    case FrequencyType.QUARTERLY:
      return Math.max(1, Math.ceil(daysAfterGrace / 90));
    case FrequencyType.YEARLY:
      return Math.max(1, Math.ceil(daysAfterGrace / 365));
    case FrequencyType.MONTHLY:
    default:
      return Math.max(1, Math.ceil(daysAfterGrace / 30));
  }
}

export function computeLateFee(
  rules: ResolvedFinancialRules,
  baseAmount: number,
  daysOverdue: number
): number {
  if (!rules.lateFeeEnabled || daysOverdue <= rules.graceDays) return 0;

  const daysAfterGrace = daysOverdue - rules.graceDays;
  const unitFee =
    rules.lateFeeFixed > 0
      ? rules.lateFeeFixed
      : amountFromRentPercent(baseAmount, rules.lateFeePercent);

  if (unitFee <= 0) return 0;

  return unitFee * overduePeriodsAfterGrace(daysAfterGrace, rules.lateFeeFrequency);
}

export type ApplicationFeeRefundInfo = {
  refundPolicy: RefundPolicyType | null;
  refundTimeframe: FrequencyType | null;
  refundTimeframeDays: number;
  isRefundable: boolean;
  refundPercent: number;
  refundSummary: string;
};

export function getApplicationFeeRefundInfo(
  rules: ResolvedFinancialRules
): ApplicationFeeRefundInfo {
  const policy = rules.refundPolicy;
  const days = rules.refundTimeframeDays;

  if (!policy || policy === RefundPolicyType.NONE) {
    return {
      refundPolicy: policy ?? RefundPolicyType.NONE,
      refundTimeframe: rules.refundTimeframe,
      refundTimeframeDays: days,
      isRefundable: false,
      refundPercent: 0,
      refundSummary: 'Application fees are non-refundable.',
    };
  }

  if (policy === RefundPolicyType.FULL) {
    return {
      refundPolicy: policy,
      refundTimeframe: rules.refundTimeframe,
      refundTimeframeDays: days,
      isRefundable: true,
      refundPercent: 100,
      refundSummary: `Full refund within ${days} day${days === 1 ? '' : 's'} if the application is declined.`,
    };
  }

  return {
    refundPolicy: policy,
    refundTimeframe: rules.refundTimeframe,
    refundTimeframeDays: days,
    isRefundable: true,
    refundPercent: 50,
    refundSummary: `Partial refund (50%) within ${days} day${days === 1 ? '' : 's'} if the application is declined.`,
  };
}

export function calculateApplicationFeeRefundAmount(
  feePaid: number,
  rules: ResolvedFinancialRules
): number {
  const info = getApplicationFeeRefundInfo(rules);
  if (!info.isRefundable || feePaid <= 0) return 0;
  return Math.round(feePaid * (info.refundPercent / 100) * 100) / 100;
}
