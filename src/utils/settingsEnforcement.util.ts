import { FrequencyType, PriceFrequency } from '@prisma/client';
import { maxApplicationFeePercentForHoldingCap } from './globalSettingsMarketRules';
import type { ResolvedFinancialRules } from './globalSettings.util';

export const PENDING_RENT_ADJUSTMENT_EVENT = 'PENDING_RENT_ADJUSTMENT';

export function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetweenCalendar(from: Date, to: Date): number {
  const start = startOfCalendarDay(from).getTime();
  const end = startOfCalendarDay(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function earliestRentIncreaseDate(
  noticeDays: number | null | undefined,
  from: Date = new Date()
): Date {
  const base = startOfCalendarDay(from);
  const days = noticeDays != null && noticeDays > 0 ? noticeDays : 0;
  base.setDate(base.getDate() + days);
  return base;
}

export function validateRentIncreaseNotice(
  effectiveDate: Date,
  noticeDays: number | null | undefined
): { valid: boolean; error?: string; earliestDate?: Date } {
  if (noticeDays == null || noticeDays <= 0) {
    return { valid: true };
  }

  const earliest = earliestRentIncreaseDate(noticeDays);
  const effective = startOfCalendarDay(effectiveDate);

  if (effective.getTime() < earliest.getTime()) {
    return {
      valid: false,
      earliestDate: earliest,
      error: `Rent increases require at least ${noticeDays} day${
        noticeDays === 1 ? '' : 's'
      } notice. Earliest effective date: ${earliest.toLocaleDateString('en-GB')}.`,
    };
  }

  return { valid: true, earliestDate: earliest };
}

export function validateInspectionNotice(
  scheduledAt: Date,
  noticeHours: number | null | undefined
): { valid: boolean; error?: string } {
  if (noticeHours == null || noticeHours <= 0) {
    return { valid: true };
  }

  const minStart = new Date(Date.now() + noticeHours * 60 * 60 * 1000);
  if (scheduledAt.getTime() < minStart.getTime()) {
    return {
      valid: false,
      error: `Inspections must be scheduled at least ${noticeHours} hour${
        noticeHours === 1 ? '' : 's'
      } in advance.`,
    };
  }

  return { valid: true };
}

export function resolveInspectionScheduledAt(
  scheduledDate: Date | string | null | undefined,
  scheduledTime?: string | null
): Date | null {
  if (!scheduledDate) return null;
  const date =
    typeof scheduledDate === 'string' ? new Date(scheduledDate) : new Date(scheduledDate);
  if (Number.isNaN(date.getTime())) return null;

  if (scheduledTime) {
    const match = String(scheduledTime).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      date.setHours(Number(match[1]), Number(match[2]), 0, 0);
      return date;
    }
  }

  date.setHours(9, 0, 0, 0);
  return date;
}

export function validateApplicationFeePercentAgainstHoldingCap(
  feePercent: number,
  holdingDepositMaxWeeks: number | null | undefined,
  rentCollectionFrequency: FrequencyType | null | undefined
): { valid: boolean; error?: string; maxPercent?: number | null } {
  const cap = maxApplicationFeePercentForHoldingCap(
    holdingDepositMaxWeeks,
    rentCollectionFrequency ?? FrequencyType.MONTHLY
  );
  if (cap == null || Number.isNaN(feePercent)) {
    return { valid: true, maxPercent: cap };
  }
  if (feePercent > cap) {
    return {
      valid: false,
      maxPercent: cap,
      error: `Application fee cannot exceed ${cap}% of one rent period for your holding deposit cap (${holdingDepositMaxWeeks} week(s)).`,
    };
  }
  return { valid: true, maxPercent: cap };
}

export function computeDepositReturnDeadline(
  moveOutDate: Date,
  depositReturnDays: number
): Date {
  const deadline = startOfCalendarDay(moveOutDate);
  deadline.setDate(deadline.getDate() + Math.max(0, depositReturnDays));
  return deadline;
}

export function frequencyTypeToPriceFrequency(
  freq?: FrequencyType | null
): PriceFrequency | null {
  if (!freq) return null;
  switch (freq) {
    case FrequencyType.DAILY:
      return PriceFrequency.DAILY;
    case FrequencyType.WEEKLY:
      return PriceFrequency.WEEKLY;
    case FrequencyType.MONTHLY:
      return PriceFrequency.MONTHLY;
    case FrequencyType.QUARTERLY:
      return PriceFrequency.QUARTERLY;
    case FrequencyType.YEARLY:
      return PriceFrequency.ANNUALLY;
    default:
      return PriceFrequency.MONTHLY;
  }
}

export function isWithinRefundTimeframe(
  paidAt: Date,
  refundTimeframeDays: number
): boolean {
  if (refundTimeframeDays <= 0) return true;
  const elapsed = daysBetweenCalendar(paidAt, new Date());
  return elapsed <= refundTimeframeDays;
}

export type PendingRentAdjustmentPayload = {
  tenantId: string;
  propertyId: string;
  landlordId: string;
  oldRent: number;
  newRent: number;
  effectiveDate: string;
  appliedAt?: string;
};

export function parsePendingRentAdjustment(
  subjects?: string | null
): PendingRentAdjustmentPayload | null {
  if (!subjects) return null;
  try {
    const parsed = JSON.parse(subjects) as PendingRentAdjustmentPayload;
    if (
      !parsed?.tenantId ||
      !parsed?.propertyId ||
      !parsed?.effectiveDate ||
      !Number.isFinite(Number(parsed.newRent))
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
