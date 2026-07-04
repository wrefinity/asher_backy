import { ApplicationStatus, Currency } from '@prisma/client';

export type MoveInPaymentContext = {
  required: boolean;
  rentAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: Currency;
  propertyId: string | null;
  landlordUserId: string | null;
  applicationId: string;
  tenantUserId: string;
};

function parsePositiveAmount(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'object' && raw !== null && 'toNumber' in raw
        ? Number((raw as { toNumber: () => number }).toNumber())
        : parseFloat(String(raw));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function resolveCurrency(property: any, fallback?: Currency | null): Currency {
  const candidate = property?.currency || fallback;
  if (candidate && Object.values(Currency).includes(candidate as Currency)) {
    return candidate as Currency;
  }
  return Currency.GBP;
}

export function resolveMoveInPaymentContext(application: any): MoveInPaymentContext {
  const property =
    application?.properties ||
    application?.propertyListing?.property ||
    application?.applicationInvites?.properties ||
    null;

  const listing = application?.propertyListing;

  const depositAmount =
    parsePositiveAmount(application?.securityDeposit) ||
    parsePositiveAmount(listing?.securityDeposit) ||
    parsePositiveAmount(property?.securityDeposit) ||
    parsePositiveAmount(property?.initialDeposit);

  const rentAmount =
    parsePositiveAmount(listing?.price) ||
    parsePositiveAmount(property?.price) ||
    parsePositiveAmount(property?.rentalFee);

  const totalAmount = Math.round((depositAmount + rentAmount) * 100) / 100;
  const currency = resolveCurrency(property, application?.properties?.currency);
  const propertyId = property?.id || listing?.propertyId || null;
  const landlordUserId = property?.landlord?.userId || null;
  const status = String(application?.status || '').toUpperCase();
  const required =
    status === ApplicationStatus.MAKEPAYMENT && totalAmount > 0;

  return {
    required,
    rentAmount,
    depositAmount,
    totalAmount,
    currency,
    propertyId,
    landlordUserId,
    applicationId: application.id,
    tenantUserId: application.userId,
  };
}
