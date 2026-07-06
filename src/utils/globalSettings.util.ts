import {
  FrequencyType,
  LatePaymentFeeType,
  PriceFrequency,
  RefundPolicyType,
  ReminderMethodType,
} from '@prisma/client';
import type { IGlobalSetting } from '../landlord/validations/interfaces/propsSettings';

/** One rent period is always included in the deposit (e.g. one month's rent). */
export const DEPOSIT_BASE_PERCENT = 100;

/** Max extra % on top of one rent period (stored total cap is base + increase). */
export const MAX_DEPOSIT_INCREASE_PERCENT = 500;

/** Stored total % of rent → extra % above one rent period. */
export function depositTotalToIncreasePercent(
  total?: number | null
): number | undefined {
  if (total == null || total <= 0) return undefined;
  return Math.max(0, total - DEPOSIT_BASE_PERCENT);
}

/** Extra % above one rent period → stored total % of rent. */
export function depositIncreaseToTotalPercent(
  increase?: number | string | null
): number | undefined {
  if (increase == null || increase === '') return undefined;
  const n = Number(increase);
  if (Number.isNaN(n) || n < 0) return undefined;
  return DEPOSIT_BASE_PERCENT + n;
}

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

/** SMS is deprecated — map to EMAIL (no SMS provider). */
export function normalizeReminderMethods(
  methods?: (ReminderMethodType | string)[] | null
): ReminderMethodType[] {
  if (!methods?.length) return [];

  const normalized = new Set<ReminderMethodType>();
  for (const method of methods) {
    const upper = String(method).toUpperCase() as ReminderMethodType;
    if (upper === ReminderMethodType.SMS) {
      normalized.add(ReminderMethodType.EMAIL);
      continue;
    }
    if (Object.values(ReminderMethodType).includes(upper)) {
      normalized.add(upper);
    }
  }
  return Array.from(normalized);
}

export function reminderMethodsNeedMigration(
  methods?: (ReminderMethodType | string)[] | null
): boolean {
  return (methods ?? []).some(
    (method) => String(method).toUpperCase() === ReminderMethodType.SMS
  );
}

export type ResolvedFinancialRules = {
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
  lateFeePercent: number;
  lateFeeMaxPercent: number | null;
  lateFeeFixed: number;
  lateFeeFrequency: FrequencyType | null;
  graceDays: number;
  depositAmount: number;
  depositPercent: number;
  applicationFeeAmount: number;
  applicationFeePercent: number;
  refundPolicy: RefundPolicyType | null;
  refundPartialPercentage: number;
  refundTimeframe: FrequencyType | null;
  refundTimeframeDays: number;
  depositReturnTimeframeDays: number;
  notificationEnabled: boolean;
  rentReminderIntervalDays: number;
  billReminderIntervalDays: number;
  reminderIntervalDays: number;
  reminderMethods: string[];
  rentIncreaseNoticeDays: number | null;
  defaultRentDueDay: number | null;
  inspectionNoticeHours: number | null;
  autoCreateRentBill: boolean;
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
  const rawLateFeePercent = settings?.lateFeePercentage ?? 0;
  const lateFeeMaxPercent = settings?.lateFeeMaxPercent ?? null;
  const lateFeePercent =
    lateFeeMaxPercent != null
      ? Math.min(rawLateFeePercent, lateFeeMaxPercent)
      : rawLateFeePercent;
  const depositPercent = settings?.depositPercentage ?? 0;
  const applicationFeePercent = settings?.applicationFeePercentage ?? 0;
  const refundTimeframe = settings?.refundTimeframe ?? null;
  const depositReturnTimeframe = settings?.depositReturnTimeframe ?? null;
  const rentReminderIntervalDays = daysFromPeriodPercent(
    settings?.notificationFrequency,
    frequency
  );
  const billReminderIntervalDays = daysFromPeriodPercent(
    settings?.billReminderLeadPercent ?? settings?.notificationFrequency,
    frequency
  );

  return {
    lateFeeEnabled: settings?.lateFeeEnabled ?? false,
    lateFeeAmount: amountFromRentPercent(rent, lateFeePercent),
    lateFeePercent,
    lateFeeMaxPercent,
    lateFeeFixed: 0,
    lateFeeFrequency: settings?.lateFeeFrequency ?? null,
    graceDays: daysFromPeriodPercent(settings?.lateFeeGracePeriod, frequency),
    depositAmount: amountFromRentPercent(rent, depositPercent),
    depositPercent,
    applicationFeeAmount: amountFromRentPercent(rent, applicationFeePercent),
    applicationFeePercent,
    refundPolicy: settings?.refundPolicy ?? null,
    refundPartialPercentage: settings?.refundPartialPercentage ?? 50,
    refundTimeframe,
    refundTimeframeDays: daysForFrequencyType(refundTimeframe),
    depositReturnTimeframeDays: daysForFrequencyType(depositReturnTimeframe),
    notificationEnabled: settings?.notificationEnabled ?? false,
    rentReminderIntervalDays,
    billReminderIntervalDays,
    reminderIntervalDays: rentReminderIntervalDays,
    reminderMethods: normalizeReminderMethods(settings?.reminderMethods),
    rentIncreaseNoticeDays: settings?.rentIncreaseNoticeDays ?? null,
    defaultRentDueDay: settings?.defaultRentDueDay ?? null,
    inspectionNoticeHours: settings?.inspectionNoticeHours ?? null,
    autoCreateRentBill: settings?.autoCreateRentBill ?? false,
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
    lateFeeEnabled: base.lateFeeEnabled,
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
  gracePeriodDays?: number | string | null;
  lateFeeFrequency?: LatePaymentFeeType | null;
} | null): PropertyFinancialOverride | null {
  if (!record) return null;

  const fixed =
    record.lateFee != null
      ? typeof record.lateFee === 'number'
        ? record.lateFee
        : record.lateFee.toNumber?.() ?? Number(record.lateFee)
      : 0;

  const parsedGrace = parseGracePeriodDays(record.gracePeriodDays);

  return {
    lateFeeEnabled: (record.lateFeePercentage ?? 0) > 0 || fixed > 0,
    lateFeePercent: record.lateFeePercentage ?? null,
    lateFeeFixed: fixed > 0 ? fixed : null,
    graceDays: parsedGrace,
    lateFeeFrequency: mapFromPropertyLateFeeFrequency(record.lateFeeFrequency),
  };
}

/** Re-apply global late-fee cap after property overrides are merged. */
export function capMergedLateFeePercent(
  rules: ResolvedFinancialRules,
  baseAmount = 0
): ResolvedFinancialRules {
  if (rules.lateFeeMaxPercent == null || rules.lateFeePercent <= rules.lateFeeMaxPercent) {
    return rules;
  }
  const lateFeePercent = rules.lateFeeMaxPercent;
  return {
    ...rules,
    lateFeePercent,
    lateFeeAmount:
      rules.lateFeeFixed > 0
        ? rules.lateFeeFixed
        : amountFromRentPercent(baseAmount, lateFeePercent),
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

  const partialPct = rules.refundPartialPercentage ?? 50;
  return {
    refundPolicy: policy,
    refundTimeframe: rules.refundTimeframe,
    refundTimeframeDays: days,
    isRefundable: true,
    refundPercent: partialPct,
    refundSummary: `Partial refund (${partialPct}%) within ${days} day${days === 1 ? '' : 's'} if the application is declined.`,
  };
}

/** Next rent due date using landlord default due day (1–28). */
export function resolveDefaultRentDueDate(
  rules: Pick<ResolvedFinancialRules, 'defaultRentDueDay'>,
  from: Date = new Date()
): Date {
  const due = new Date(from);
  const day = rules.defaultRentDueDay;
  if (day != null && day >= 1 && day <= 28) {
    due.setDate(day);
    if (due <= from) {
      due.setMonth(due.getMonth() + 1);
    }
  } else {
    due.setMonth(due.getMonth() + 1);
  }
  due.setHours(12, 0, 0, 0);
  return due;
}

export function isRentBillRecord(bill: { billName?: string | null; bills?: { name?: string | null } | null }): boolean {
  const name = `${bill.billName ?? ''} ${bill.bills?.name ?? ''}`.toLowerCase();
  return name.includes('rent');
}

export function calculateApplicationFeeRefundAmount(
  feePaid: number,
  rules: ResolvedFinancialRules
): number {
  const info = getApplicationFeeRefundInfo(rules);
  if (!info.isRefundable || feePaid <= 0) return 0;
  return Math.round(feePaid * (info.refundPercent / 100) * 100) / 100;
}
