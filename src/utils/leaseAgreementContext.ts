import { resolveCommercialLeaseTerm } from './commercialLeaseTerm';

const formatDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export interface LeaseAgreementContext {
  moveInDate: Date | null;
  leaseStartDate: Date | null;
  leaseEndDate: Date | null;
  leaseTermMonths: number | null;
  leaseTermDisplay: string;
}

export interface LeaseAgreementContextOptions {
  /** When the agreement document is sent / generated (defaults lease start). */
  agreementSentAt?: Date;
  /** Landlord override for tenancy start date. */
  landlordLeaseStartDate?: Date;
}

function parseMonthsFromText(text?: string | null): number | null {
  if (!text?.trim()) return null;
  const monthMatch = text.match(/(\d+)\s*months?\b/i);
  if (monthMatch) return parseInt(monthMatch[1], 10);
  const yearMatch = text.match(/(\d+)\s*years?\b/i);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 12;
  return null;
}

function parseLeaseTermMonths(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  const asInt = parseInt(raw, 10);
  if (!Number.isNaN(asInt) && asInt > 0) return asInt;
  return parseMonthsFromText(raw);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getResidentialSpec(property?: any) {
  return property?.specification?.residential ?? property?.residential ?? null;
}

function getCommercialSpec(property?: any) {
  return property?.specification?.commercial ?? property?.commercial ?? null;
}

function resolveAvailableFrom(property?: any): Date | null {
  const residential = getResidentialSpec(property);
  const raw =
    residential?.availableFrom ??
    property?.availableFrom ??
    getCommercialSpec(property)?.availableFrom;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Lease length in months from property setup (commercial min term, residential rental terms text). */
export function resolvePropertyLeaseTermMonths(
  application?: any,
  property?: any
): number | null {
  const fromApplication = parseLeaseTermMonths(application?.leaseTerm);
  if (fromApplication) return fromApplication;

  const commercial = getCommercialSpec(property);
  if (commercial?.minimumLeaseTerm != null && commercial.minimumLeaseTerm > 0) {
    const unit = String(commercial.leaseTermUnit || 'MONTHS').toUpperCase();
    if (unit === 'YEARS' || unit === 'YEAR') {
      return commercial.minimumLeaseTerm * 12;
    }
    return commercial.minimumLeaseTerm;
  }

  const residential = getResidentialSpec(property);
  const fromRentalTerms = parseMonthsFromText(residential?.rentalTerms);
  if (fromRentalTerms) return fromRentalTerms;

  const commercialTermText = resolveCommercialLeaseTerm({
    leaseTerm: commercial?.leaseTerm,
    minimumLeaseTerm: commercial?.minimumLeaseTerm,
    maximumLeaseTerm: commercial?.maximumLeaseTerm,
    leaseTermUnit: commercial?.leaseTermUnit,
  });
  const fromCommercialText = parseMonthsFromText(commercialTermText);
  if (fromCommercialText) return fromCommercialText;

  // UK AST typical fixed term when property is in UK market
  const country = String(property?.country || '').toLowerCase();
  if (/(uk|united kingdom|england|wales|scotland|northern ireland)/.test(country)) {
    return 12;
  }

  return 12;
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Resolve move-in, start, end, and term for agreement merge tags.
 * Priority:
 * - moveInDate: application (tenant form) → property available from → lease start
 * - leaseStartDate: application → landlord override → agreement sent date → today
 * - leaseTerm: application → property commercial/residential setup
 * - leaseEndDate: application → start + term months
 */
export function resolveLeaseAgreementContext(
  application?: any,
  property?: any,
  options: LeaseAgreementContextOptions = {}
): LeaseAgreementContext {
  const leaseTermMonths = resolvePropertyLeaseTermMonths(application, property);
  const leaseTermDisplay =
    leaseTermMonths != null ? String(leaseTermMonths) : '';

  const agreementSentAt = options.agreementSentAt ?? null;
  const landlordStart = toDate(options.landlordLeaseStartDate);

  let leaseStartDate =
    toDate(application?.leaseStartDate) ??
    landlordStart ??
    agreementSentAt ??
    null;

  let moveInDate =
    toDate(application?.moveInDate) ??
    resolveAvailableFrom(property) ??
    leaseStartDate;

  if (!leaseStartDate) {
    leaseStartDate = moveInDate ?? agreementSentAt ?? new Date();
  }

  if (!moveInDate) {
    moveInDate = leaseStartDate;
  }

  let leaseEndDate = toDate(application?.leaseEndDate);
  if (!leaseEndDate && leaseStartDate && leaseTermMonths) {
    leaseEndDate = addMonths(leaseStartDate, leaseTermMonths);
  }

  return {
    moveInDate,
    leaseStartDate,
    leaseEndDate,
    leaseTermMonths,
    leaseTermDisplay,
  };
}

/** Fields to persist on application when missing (backfill). */
export function buildApplicationLeaseBackfill(
  application: any,
  property?: any,
  options: LeaseAgreementContextOptions = {}
): Record<string, unknown> {
  const ctx = resolveLeaseAgreementContext(application, property, options);
  const patch: Record<string, unknown> = {};

  if (!application?.moveInDate && ctx.moveInDate) {
    patch.moveInDate = ctx.moveInDate;
  }
  if (!application?.leaseStartDate && ctx.leaseStartDate) {
    patch.leaseStartDate = ctx.leaseStartDate;
  }
  if (!application?.leaseEndDate && ctx.leaseEndDate) {
    patch.leaseEndDate = ctx.leaseEndDate;
  }
  if (!application?.leaseTerm && ctx.leaseTermDisplay) {
    patch.leaseTerm = ctx.leaseTermDisplay;
  }

  const rentValue =
    application?.rentAmountPaid ??
    property?.price ??
    property?.rentalFee ??
    application?.units?.price ??
    application?.rooms?.price;
  if ((application?.rentAmountPaid == null || application?.rentAmountPaid === '') && rentValue != null) {
    patch.rentAmountPaid = rentValue;
  }

  const depositValue =
    application?.securityDeposit ??
    property?.securityDeposit ??
    property?.initialDeposit;
  if (
    (application?.securityDeposit == null || application?.securityDeposit === '') &&
    depositValue != null
  ) {
    patch.securityDeposit = depositValue;
  }

  return patch;
}

export function applyLeaseContextToApplication(application: any, ctx: LeaseAgreementContext) {
  return {
    ...application,
    moveInDate: application?.moveInDate ?? ctx.moveInDate,
    leaseStartDate: application?.leaseStartDate ?? ctx.leaseStartDate,
    leaseEndDate: application?.leaseEndDate ?? ctx.leaseEndDate,
    leaseTerm: application?.leaseTerm ?? ctx.leaseTermDisplay,
  };
}

export { formatDate as formatAgreementDate };
