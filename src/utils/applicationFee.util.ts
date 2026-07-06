import { Currency, PriceFrequency, YesNo } from '@prisma/client';
import { prismaClient } from '..';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import {
  resolveFinancialRules,
  ResolvedFinancialRules,
} from './globalSettings.util';
import { resolvePaymentGatewayForCurrency } from './paymentGateway.util';
import { validateApplicationFeePercentAgainstHoldingCap } from './settingsEnforcement.util';

export type ApplicationFeeContext = {
  required: boolean;
  amount: number;
  currency: Currency;
  propertyId: string | null;
  landlordUserId: string | null;
  applicationId: string;
  tenantUserId: string;
};

type ApplicationFeeSource = {
  id: string;
  userId: string;
  applicationInvites?: {
    applicationFee?: YesNo | null;
  } | null;
  propertyListing?: {
    payApplicationFee?: boolean | null;
    applicationFeeAmount?: unknown;
    propertyId?: string | null;
  } | null;
  properties?: {
    id: string;
    price?: unknown;
    priceFrequency?: PriceFrequency | null;
    currency?: Currency | null;
    country?: string | null;
    landlordId?: string | null;
    landlord?: { userId?: string | null } | null;
  } | null;
};

export function selectApplicationFeeGateway(currency: string): 'STRIPE' | 'PAYSTACK' {
  return resolvePaymentGatewayForCurrency(currency) as 'STRIPE' | 'PAYSTACK';
}

function parsePositiveAmount(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const value =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'object' && raw !== null && 'toNumber' in raw
        ? Number((raw as { toNumber: () => number }).toNumber())
        : parseFloat(String(raw));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function isApplicationFeeRequired(record: ApplicationFeeSource): boolean {
  const invite = record.applicationInvites;
  const listing = record.propertyListing;
  if (invite?.applicationFee === YesNo.YES) return true;
  if (listing?.payApplicationFee === true) return true;
  const amount = resolveApplicationFeeAmountFromRecord(record);
  return amount != null && amount > 0;
}

export function resolveApplicationFeeAmountFromRecord(
  record: ApplicationFeeSource,
  rules?: ResolvedFinancialRules | null
): number | null {
  const listingAmount = parsePositiveAmount(record.propertyListing?.applicationFeeAmount);
  if (listingAmount != null) return listingAmount;
  if (rules && rules.applicationFeeAmount > 0) return rules.applicationFeeAmount;
  return null;
}

export function resolveApplicationCurrency(record: ApplicationFeeSource): Currency {
  const propertyCurrency = record.properties?.currency;
  if (propertyCurrency && Object.values(Currency).includes(propertyCurrency)) {
    return propertyCurrency;
  }
  const country = (record.properties?.country || '').toUpperCase();
  if (country === 'NG' || country === 'NIGERIA') return Currency.NGN;
  if (country === 'US' || country === 'USA') return Currency.USD;
  if (
    country === 'GB' ||
    country === 'UK' ||
    country === 'UNITED KINGDOM' ||
    country === 'ENGLAND'
  ) {
    return Currency.GBP;
  }
  return Currency.GBP;
}

export async function resolveApplicationFeeContext(
  record: ApplicationFeeSource
): Promise<ApplicationFeeContext> {
  let property = record.properties;
  const propertyIdFromListing = record.propertyListing?.propertyId ?? null;

  if (!property?.landlord?.userId && propertyIdFromListing) {
    const loaded = await prismaClient.properties.findUnique({
      where: { id: propertyIdFromListing },
      select: {
        id: true,
        price: true,
        priceFrequency: true,
        currency: true,
        country: true,
        landlordId: true,
        landlord: { select: { userId: true } },
      },
    });
    if (loaded) {
      property = loaded;
    }
  }

  const landlordUserId = property?.landlord?.userId ?? null;
  const propertyId = property?.id ?? propertyIdFromListing ?? null;

  let rules: ResolvedFinancialRules | null = null;
  if (property?.landlordId && property.price != null) {
    const globalSettings = await LandlordSettingsService.getAllGlobalSettings(
      property.landlordId
    );
    rules = resolveFinancialRules(
      globalSettings,
      Number(property.price),
      property.priceFrequency
    );
  }

  const amount = resolveApplicationFeeAmountFromRecord(record, rules) ?? 0;
  const required = isApplicationFeeRequired(record) || amount > 0;

  return {
    required,
    amount,
    currency: resolveApplicationCurrency(record),
    propertyId,
    landlordUserId,
    applicationId: record.id,
    tenantUserId: record.userId,
  };
}

export async function assertApplicationFeeWithinHoldingCap(
  record: ApplicationFeeSource,
  rules: ResolvedFinancialRules | null,
  globalSettings?: Awaited<ReturnType<typeof LandlordSettingsService.getAllGlobalSettings>>
): Promise<void> {
  const amount = resolveApplicationFeeAmountFromRecord(record, rules);
  if (!amount || amount <= 0) return;

  let settings = globalSettings;
  if (!settings && record.properties?.landlordId) {
    settings = await LandlordSettingsService.getAllGlobalSettings(
      record.properties.landlordId
    );
  }

  const rent = Number(record.properties?.price ?? 0);
  if (rent > 0 && settings?.holdingDepositMaxWeeks) {
    const capCheck = validateApplicationFeePercentAgainstHoldingCap(
      (amount / rent) * 100,
      settings.holdingDepositMaxWeeks,
      settings.defaultRentCollectionFrequency ?? null
    );
    if (!capCheck.valid) {
      throw new Error(capCheck.error ?? 'Application fee exceeds holding deposit cap');
    }
  }

  if (!rules || rules.applicationFeePercent <= 0) return;

  const percentCheck = validateApplicationFeePercentAgainstHoldingCap(
    rules.applicationFeePercent,
    settings?.holdingDepositMaxWeeks,
    settings?.defaultRentCollectionFrequency ?? null
  );
  if (!percentCheck.valid) {
    throw new Error(percentCheck.error ?? 'Application fee exceeds holding deposit cap');
  }
}
