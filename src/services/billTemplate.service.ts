import { PaymentFrequency, PriceFrequency } from '@prisma/client';
import { prismaClient } from '..';
import billServices from '../landlord/services/bill.services';
import { marketCodeFromCountry } from '../utils/marketCodes';
import { getBillCatalogForMarket } from '../utils/billCatalog';

export type PropertyBillTemplate = {
  templateKey: string;
  billName: string;
  description: string;
  amount: number;
  suggestedFrequency: PaymentFrequency;
  categoryName: string;
  tags?: string[];
};

export type CreateBillFromTemplateInput = {
  templateKey: string;
  propertyId: string;
  tenantId?: string;
  amount?: number;
  dueDate: Date | string;
  notify?: boolean;
};

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  'service-charge': ['Service & estate charges', 'Service & estate', 'Service & management'],
  'rent-increase': ['Rent & occupancy', 'Rent & deposits', 'Rent & fees'],
  parking: ['Parking & amenities', 'Parking & extras'],
  hoa: ['HOA & property', 'Service & estate'],
  'property-tax': ['HOA & property', 'Fees & penalties'],
  groundRent: ['Service & estate charges', 'Service & estate'],
};

function priceFrequencyToPayment(frequency?: PriceFrequency | null): PaymentFrequency {
  switch (frequency) {
    case PriceFrequency.WEEKLY:
      return PaymentFrequency.WEEKLY;
    case PriceFrequency.QUARTERLY:
      return PaymentFrequency.QUARTERLY;
    case PriceFrequency.ANNUALLY:
      return PaymentFrequency.ANNUALLY;
    case PriceFrequency.DAILY:
      return PaymentFrequency.DAILY;
    default:
      return PaymentFrequency.MONTHLY;
  }
}

class BillTemplateService {
  private async resolveCategoryId(names: string[]): Promise<string | null> {
    for (const name of names) {
      const category = await prismaClient.bills.findFirst({
        where: {
          isDeleted: false,
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (category) return category.id;
    }
    return null;
  }

  private async resolveCategoryForTag(tag: string, market: string): Promise<string | null> {
    const fallbacks = CATEGORY_FALLBACKS[tag] ?? [];
    const fromCatalog = getBillCatalogForMarket(market)
      .flatMap((category) =>
        category.items
          .filter((item) => item.tags?.includes(tag))
          .map(() => category.name)
      );
    const names = [...new Set([...fromCatalog, ...fallbacks])];
    return this.resolveCategoryId(names);
  }

  async getPropertyChargeTemplates(propertyId: string): Promise<PropertyBillTemplate[]> {
    const property = await prismaClient.properties.findUnique({
      where: { id: propertyId },
      include: {
        specification: {
          where: { isActive: true },
          include: {
            residential: true,
            commercial: true,
          },
          take: 1,
        },
      },
    });

    if (!property) return [];

    const market = marketCodeFromCountry(property.country) ?? 'UK';
    const rentFrequency = priceFrequencyToPayment(property.priceFrequency);
    const templates: PropertyBillTemplate[] = [];

    const spec = property.specification?.[0];
    const residential = spec?.residential;
    const commercial = spec?.commercial;

    const serviceCharge = residential?.serviceCharge ?? commercial?.serviceCharge;
    if (serviceCharge && Number(serviceCharge) > 0) {
      templates.push({
        templateKey: 'service-charge',
        billName: 'Service charge',
        description: 'Property service / estate charge from listing',
        amount: Number(serviceCharge),
        suggestedFrequency: PaymentFrequency.QUARTERLY,
        categoryName: 'Service & estate charges',
        tags: ['service-charge'],
      });
    }

    const groundRent = residential?.groundRent;
    if (groundRent && Number(groundRent) > 0) {
      templates.push({
        templateKey: 'ground-rent',
        billName: 'Ground rent',
        description: 'Leasehold ground rent from listing',
        amount: Number(groundRent),
        suggestedFrequency: PaymentFrequency.ANNUALLY,
        categoryName: 'Service & estate charges',
        tags: ['ground-rent'],
      });
    }

    const hoaFees = residential?.hoaFees;
    if (hoaFees && Number(hoaFees) > 0) {
      templates.push({
        templateKey: 'hoa-fee',
        billName: 'HOA / condo fee',
        description: 'HOA fee from property listing',
        amount: Number(hoaFees),
        suggestedFrequency: PaymentFrequency.MONTHLY,
        categoryName: 'HOA & property',
        tags: ['hoa'],
      });
    }

    const propertyTax = residential?.propertyTax;
    if (propertyTax && Number(propertyTax) > 0) {
      templates.push({
        templateKey: 'property-tax',
        billName: 'Property tax pass-through',
        description: 'Tenant share of property tax from listing',
        amount: Number(propertyTax),
        suggestedFrequency: PaymentFrequency.YEARLY,
        categoryName: 'HOA & property',
        tags: ['property-tax'],
      });
    }

    if (property.price && Number(property.price) > 0) {
      templates.push({
        templateKey: 'rent',
        billName: 'Rent',
        description: 'Periodic rent charge from property listing',
        amount: Number(property.price),
        suggestedFrequency: rentFrequency,
        categoryName: 'Rent & occupancy',
        tags: ['rent'],
      });
    }

    if (commercial?.parkingSpaces && commercial.parkingSpaces > 0) {
      templates.push({
        templateKey: 'parking',
        billName: 'Parking space',
        description: `${commercial.parkingSpaces} parking space(s) — set amount when creating bill`,
        amount: 0,
        suggestedFrequency: PaymentFrequency.MONTHLY,
        categoryName: 'Parking & amenities',
        tags: ['parking'],
      });
    }

    void market;
    return templates;
  }

  async createBillFromTemplate(
    landlordId: string,
    input: CreateBillFromTemplateInput
  ) {
    const templates = await this.getPropertyChargeTemplates(input.propertyId);
    const template = templates.find((t) => t.templateKey === input.templateKey);
    if (!template) {
      throw new Error(`Unknown bill template: ${input.templateKey}`);
    }

    const property = await prismaClient.properties.findUnique({
      where: { id: input.propertyId },
      select: { country: true },
    });
    const market = marketCodeFromCountry(property?.country) ?? 'UK';
    const tag = template.tags?.[0] ?? template.templateKey;
    let categoryId = await this.resolveCategoryForTag(tag, market);
    if (!categoryId) {
      categoryId = await this.resolveCategoryId([template.categoryName, 'General']);
    }
    if (!categoryId) {
      categoryId = await billServices.ensureDefaultBillCategory();
    }

    const amount = input.amount ?? template.amount;
    if (!amount || amount <= 0) {
      throw new Error('Bill amount must be greater than zero');
    }

    return billServices.createSubBills(
      {
        billName: template.billName,
        billCategoryId: categoryId,
        description: template.description,
        amount,
        billFrequency: template.suggestedFrequency,
        dueDate: new Date(input.dueDate),
        payableBy: 'TENANT',
        propertyId: input.propertyId,
        tenantId: input.tenantId,
      },
      landlordId
    );
  }

  async createInitialRentBill(params: {
    landlordId: string;
    propertyId: string;
    tenantId: string;
    rent: number;
    dueDate: Date;
  }) {
    if (!params.rent || params.rent <= 0) return null;

    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { country: true, priceFrequency: true },
    });
    const market = marketCodeFromCountry(property?.country) ?? 'UK';
    let categoryId = await this.resolveCategoryForTag('rent', market);
    if (!categoryId) {
      categoryId = await this.resolveCategoryId(['Rent & occupancy', 'Rent & deposits', 'General']);
    }
    if (!categoryId) {
      categoryId = await billServices.ensureDefaultBillCategory();
    }

    return billServices.createSubBills(
      {
        billName: 'Rent',
        billCategoryId: categoryId,
        description: 'Recurring rent charge',
        amount: params.rent,
        billFrequency: priceFrequencyToPayment(property?.priceFrequency),
        dueDate: params.dueDate,
        payableBy: 'TENANT',
        propertyId: params.propertyId,
        tenantId: params.tenantId,
      },
      params.landlordId
    );
  }

  async createRentIncreaseBill(params: {
    landlordId: string;
    propertyId: string;
    tenantId: string;
    oldRent: number;
    newRent: number;
    dueDate: Date;
  }) {
    const increase = Number(params.newRent) - Number(params.oldRent);
    if (increase <= 0) return null;

    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { country: true, priceFrequency: true },
    });
    const market = marketCodeFromCountry(property?.country) ?? 'UK';
    let categoryId = await this.resolveCategoryForTag('rent-increase', market);
    if (!categoryId) {
      categoryId = await billServices.ensureDefaultBillCategory();
    }

    return billServices.createSubBills(
      {
        billName: 'Rent increase',
        billCategoryId: categoryId,
        description: `Rent adjusted from ${params.oldRent} to ${params.newRent}`,
        amount: increase,
        billFrequency: priceFrequencyToPayment(property?.priceFrequency),
        dueDate: params.dueDate,
        payableBy: 'TENANT',
        propertyId: params.propertyId,
        tenantId: params.tenantId,
      },
      params.landlordId
    );
  }

  /** Full renewed rent charge when a lease renewal agreement is sent (not just the delta). */
  async createRenewalRentBill(params: {
    landlordId: string;
    propertyId: string;
    tenantId: string;
    oldRent: number;
    newRent: number;
    dueDate: Date;
    effectiveDate: Date;
  }) {
    const renewedRent = Number(params.newRent);
    if (!Number.isFinite(renewedRent) || renewedRent <= 0) return null;

    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { country: true, priceFrequency: true },
    });
    const market = marketCodeFromCountry(property?.country) ?? 'UK';
    let categoryId = await this.resolveCategoryForTag('rent', market);
    if (!categoryId) {
      categoryId = await this.resolveCategoryId(['Rent & occupancy', 'Rent & deposits', 'General']);
    }
    if (!categoryId) {
      categoryId = await billServices.ensureDefaultBillCategory();
    }

    const { buildRenewalRentBillDescription } = await import('../utils/renewalEffectiveDate');

    return billServices.createSubBills(
      {
        billName: 'Renewal rent',
        billCategoryId: categoryId,
        description: buildRenewalRentBillDescription({
          oldRent: params.oldRent,
          newRent: renewedRent,
          effectiveDate: params.effectiveDate,
        }),
        amount: renewedRent,
        billFrequency: priceFrequencyToPayment(property?.priceFrequency),
        dueDate: params.dueDate,
        payableBy: 'TENANT',
        propertyId: params.propertyId,
        tenantId: params.tenantId,
      },
      params.landlordId
    );
  }
}

export default new BillTemplateService();
