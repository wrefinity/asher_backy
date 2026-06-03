import { Decimal } from '@prisma/client/runtime/library';
import { prismaClient } from '..';
import { PLATFORM_DEFAULT_CURRENCY } from '../secrets';

export interface PropertyValueData {
  id: string;
  propertyId: string;
  propertyName: string;
  currentValue: number;
  purchaseValue: number;
  purchaseDate: Date;
  appreciationRate: number;
  projectedValue5Years: number;
  projectedValue10Years: number;
  projectedValue15Years: number;
  lastUpdated: Date;
}

export interface PropertyValueAnalytics {
  /** Currency stored on property records (amounts are in this currency). */
  sourceCurrency: string;
  totalPortfolioValue: number;
  totalPurchaseValue: number;
  totalAppreciation: number;
  averageAppreciationRate: number;
  portfolioGrowth: number;
  properties: PropertyValueData[];
}

const DEFAULT_APPRECIATION_RATE = 0.05;

type PropertyWithSpecs = {
  id: string;
  name: string;
  createdAt: Date;
  currency?: string | null;
  marketValue: Decimal | null;
  propertyValue: Decimal | null;
  price: Decimal | null;
  specification: Array<{
    residential?: {
      unitConfigurations: Array<{ price?: string | Decimal | null }>;
      roomDetails?: Array<{ price?: string | Decimal | null }>;
    } | null;
    commercial?: {
      unitConfigurations: Array<{ price?: string | Decimal | null }>;
      roomDetails?: Array<{ price?: string | Decimal | null }>;
    } | null;
  }>;
};

class PropertyValueService {
  private parseAmount(value: unknown): number {
    if (value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private annualRentFromUnits(property: PropertyWithSpecs): number {
    let annual = 0;
    for (const spec of property.specification) {
      const buckets = [
        spec.residential?.unitConfigurations,
        spec.residential?.roomDetails,
        spec.commercial?.unitConfigurations,
        spec.commercial?.roomDetails,
      ];
      for (const list of buckets) {
        if (!list) continue;
        for (const slot of list) {
          annual += this.parseAmount(slot.price) * 12;
        }
      }
    }
    return annual;
  }

  /** Prefer DB marketValue / propertyValue, then units, then property.price (monthly rent). */
  private resolveValuation(property: PropertyWithSpecs): {
    currentValue: number;
    purchaseValue: number;
    appreciationRate: number;
  } {
    const marketValue = this.parseAmount(property.marketValue);
    const storedPropertyValue = this.parseAmount(property.propertyValue);
    const monthlyRent = this.parseAmount(property.price);
    const annualFromUnits = this.annualRentFromUnits(property);
    const annualFromPrice = monthlyRent * 12;

    let currentValue = marketValue;
    if (currentValue <= 0 && storedPropertyValue > 0) {
      currentValue = storedPropertyValue;
    }
    if (currentValue <= 0 && annualFromUnits > 0) {
      currentValue = annualFromUnits * 10;
    }
    if (currentValue <= 0 && annualFromPrice > 0) {
      currentValue = annualFromPrice * 10;
    }

    let purchaseValue = storedPropertyValue;
    if (purchaseValue <= 0 && currentValue > 0) {
      purchaseValue = currentValue * 0.7;
    }
    if (purchaseValue > currentValue && currentValue > 0) {
      purchaseValue = currentValue * 0.7;
    }

    const appreciationRate =
      purchaseValue > 0
        ? Math.max(0, (currentValue - purchaseValue) / purchaseValue)
        : DEFAULT_APPRECIATION_RATE;

    return {
      currentValue: Math.round(currentValue * 100) / 100,
      purchaseValue: Math.round(purchaseValue * 100) / 100,
      appreciationRate:
        appreciationRate > 0 ? appreciationRate : DEFAULT_APPRECIATION_RATE,
    };
  }

  private buildPropertyValueRow(property: PropertyWithSpecs): PropertyValueData {
    const { currentValue, purchaseValue, appreciationRate } =
      this.resolveValuation(property);
    const rate = appreciationRate || DEFAULT_APPRECIATION_RATE;

    return {
      id: property.id,
      propertyId: property.id,
      propertyName: property.name,
      currentValue,
      purchaseValue,
      purchaseDate: property.createdAt,
      appreciationRate: rate,
      projectedValue5Years:
        Math.round(currentValue * Math.pow(1 + rate, 5) * 100) / 100,
      projectedValue10Years:
        Math.round(currentValue * Math.pow(1 + rate, 10) * 100) / 100,
      projectedValue15Years:
        Math.round(currentValue * Math.pow(1 + rate, 15) * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  async getPropertyValueAnalytics(
    landlordId: string
  ): Promise<PropertyValueAnalytics> {
    const properties = await prismaClient.properties.findMany({
      where: {
        landlordId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        currency: true,
        marketValue: true,
        propertyValue: true,
        price: true,
        specification: {
          where: { isActive: true },
          include: {
            residential: {
              include: {
                unitConfigurations: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
                roomDetails: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
              },
            },
            commercial: {
              include: {
                unitConfigurations: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
                roomDetails: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
              },
            },
          },
        },
      },
    });

    if (properties.length === 0) {
      return {
        sourceCurrency: PLATFORM_DEFAULT_CURRENCY,
        totalPortfolioValue: 0,
        totalPurchaseValue: 0,
        totalAppreciation: 0,
        averageAppreciationRate: 0,
        portfolioGrowth: 0,
        properties: [],
      };
    }

    const sourceCurrency =
      properties.find(p => p.currency)?.currency?.toString() ||
      PLATFORM_DEFAULT_CURRENCY;

    const propertyValues = properties
      .map(p => this.buildPropertyValueRow(p as PropertyWithSpecs))
      .filter(p => p.currentValue > 0 || p.purchaseValue > 0);

    const totalPortfolioValue = propertyValues.reduce(
      (sum, p) => sum + p.currentValue,
      0
    );
    const totalPurchaseValue = propertyValues.reduce(
      (sum, p) => sum + p.purchaseValue,
      0
    );
    const totalAppreciation = totalPortfolioValue - totalPurchaseValue;
    const averageAppreciationRate =
      propertyValues.length > 0
        ? propertyValues.reduce((sum, p) => sum + p.appreciationRate, 0) /
          propertyValues.length
        : 0;
    const portfolioGrowth =
      totalPurchaseValue > 0
        ? (totalAppreciation / totalPurchaseValue) * 100
        : 0;

    return {
      sourceCurrency,
      totalPortfolioValue,
      totalPurchaseValue,
      totalAppreciation,
      averageAppreciationRate,
      portfolioGrowth,
      properties: propertyValues,
    };
  }

  async getPropertyValueById(
    landlordId: string,
    propertyId: string
  ): Promise<PropertyValueData | null> {
    const property = await prismaClient.properties.findFirst({
      where: {
        id: propertyId,
        landlordId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        currency: true,
        marketValue: true,
        propertyValue: true,
        price: true,
        specification: {
          where: { isActive: true },
          include: {
            residential: {
              include: {
                unitConfigurations: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
                roomDetails: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
              },
            },
            commercial: {
              include: {
                unitConfigurations: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
                roomDetails: {
                  where: { isDeleted: false },
                  select: { price: true },
                },
              },
            },
          },
        },
      },
    });

    if (!property) return null;
    return this.buildPropertyValueRow(property as PropertyWithSpecs);
  }
}

export default new PropertyValueService();
