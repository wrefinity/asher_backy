import { Decimal } from "@prisma/client/runtime/library";
import { prismaClient } from "..";

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
  totalPortfolioValue: number;
  totalPurchaseValue: number;
  totalAppreciation: number;
  averageAppreciationRate: number;
  portfolioGrowth: number;
  properties: PropertyValueData[];
}

class PropertyValueService {
  async getPropertyValueAnalytics(landlordId: string): Promise<PropertyValueAnalytics> {
    // Get all properties for the landlord
    const properties = await prismaClient.properties.findMany({
      where: {
        landlordId: landlordId,
        isDeleted: false
      },
      include: {
        specification: {
          include: {
            residential: {
              include: {
                unitConfigurations: {
                  select: {
                    id: true,
                    price: true
                  }
                }
              }
            },
            commercial: {
              include: {
                unitConfigurations: {
                  select: {
                    id: true,
                    price: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (properties.length === 0) {
      return {
        totalPortfolioValue: 0,
        totalPurchaseValue: 0,
        totalAppreciation: 0,
        averageAppreciationRate: 0,
        portfolioGrowth: 0,
        properties: []
      };
    }

    // Calculate property values (simplified calculation)
    const propertyValues = properties.map(property => {
      // Get all unit configurations from both residential and commercial specifications
      const allUnits = [];
      
      property.specification.forEach(spec => {
        if (spec.residential?.unitConfigurations) {
          allUnits.push(...spec.residential.unitConfigurations);
        }
        if (spec.commercial?.unitConfigurations) {
          allUnits.push(...spec.commercial.unitConfigurations);
        }
      });
      
      // Estimate current value based on rent (rough calculation: 10x annual rent)
      const totalAnnualRent = allUnits.reduce((sum, unit) => sum + (parseFloat(unit.price) || 0) * 12, 0);
      const currentValue = totalAnnualRent * 10; // Simplified valuation
      
      // Estimate purchase value (assume 70% of current value)
      const purchaseValue = currentValue * 0.7;
      
      // Calculate appreciation rate (assume 5% annually)
      const appreciationRate = 0.05;
      
      // Calculate projected values
      const projectedValue5Years = currentValue * Math.pow(1 + appreciationRate, 5);
      const projectedValue10Years = currentValue * Math.pow(1 + appreciationRate, 10);
      const projectedValue15Years = currentValue * Math.pow(1 + appreciationRate, 15);

      return {
        id: property.id,
        propertyId: property.id,
        propertyName: property.name,
        currentValue,
        purchaseValue,
        purchaseDate: property.createdAt,
        appreciationRate,
        projectedValue5Years,
        projectedValue10Years,
        projectedValue15Years,
        lastUpdated: new Date()
      };
    });

    // Calculate analytics
    const totalPortfolioValue = propertyValues.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPurchaseValue = propertyValues.reduce((sum, p) => sum + p.purchaseValue, 0);
    const totalAppreciation = totalPortfolioValue - totalPurchaseValue;
    const averageAppreciationRate = propertyValues.reduce((sum, p) => sum + p.appreciationRate, 0) / propertyValues.length;
    const portfolioGrowth = totalPurchaseValue > 0 ? (totalAppreciation / totalPurchaseValue) * 100 : 0;

    return {
      totalPortfolioValue,
      totalPurchaseValue,
      totalAppreciation,
      averageAppreciationRate,
      portfolioGrowth,
      properties: propertyValues
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
      include: {
        specification: {
          where: { isActive: true },
          include: {
            residential: {
              include: {
                unitConfigurations: { where: { isDeleted: false } },
                roomDetails: { where: { isDeleted: false } },
              },
            },
            commercial: {
              include: {
                unitConfigurations: { where: { isDeleted: false } },
                roomDetails: { where: { isDeleted: false } },
              },
            }
          },
        },
      },
    });

    if (!property) return null;

    // Collect all nested units and rooms across all specification types
    const allUnits: Array<{ price?: string | Decimal }> = [];
    const allRooms: Array<{ price?: string | Decimal }> = [];

    property.specification.forEach((spec) => {
      if (spec.residential) {
        allUnits.push(...spec.residential.unitConfigurations);
        allRooms.push(...spec.residential.roomDetails);
      }
      if (spec.commercial) {
        allUnits.push(...spec.commercial.unitConfigurations);
        allRooms.push(...spec.commercial.roomDetails);
      }
    });

    // Calculate total annual rent
    const totalUnitRent = allUnits.reduce((sum, unit) => {
      const monthlyRent = unit.price ? parseFloat(unit.price.toString()) : 0;
      return sum + monthlyRent * 12;
    }, 0);

    const totalRoomRent = allRooms.reduce((sum, room) => {
      const monthlyRent = room.price ? parseFloat(room.price.toString()) : 0;
      return sum + monthlyRent * 12;
    }, 0);

    const totalAnnualRent = totalUnitRent + totalRoomRent;

    // Fallback: use marketValue or property.price if units/rooms are empty
    const fallbackAnnualRent = property.marketValue
      ? Number(property.marketValue)
      : property.price
      ? Number(property.price) * 12
      : 0;

    const effectiveAnnualRent =
      totalAnnualRent > 0 ? totalAnnualRent : fallbackAnnualRent;

    // Value projections
    const currentValue = effectiveAnnualRent * 10;
    const purchaseValue = currentValue * 0.7;
    const appreciationRate = 0.05;

    const projectedValue5Years = currentValue * Math.pow(1 + appreciationRate, 5);
    const projectedValue10Years = currentValue * Math.pow(1 + appreciationRate, 10);
    const projectedValue15Years = currentValue * Math.pow(1 + appreciationRate, 15);

    return {
      id: property.id,
      propertyId: property.id,
      propertyName: property.name,
      currentValue: Number(currentValue.toFixed(2)),
      purchaseValue: Number(purchaseValue.toFixed(2)),
      purchaseDate: property.createdAt,
      appreciationRate,
      projectedValue5Years: Number(projectedValue5Years.toFixed(2)),
      projectedValue10Years: Number(projectedValue10Years.toFixed(2)),
      projectedValue15Years: Number(projectedValue15Years.toFixed(2)),
      lastUpdated: new Date(),
    };
  }
}

export default new PropertyValueService();
