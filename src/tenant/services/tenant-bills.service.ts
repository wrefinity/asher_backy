
import { PaymentFrequency, PriceFrequency } from '@prisma/client';
import { prismaClient } from "../..";
import LandlordSettingsService from '../../landlord/services/propertySetting.service';
import {
  buildTenantAccessibleBillWhere,
  resolveTenantBillAccessScope,
} from '../../utils/billScope.util';
import {
  computeLateFee,
  mergeFinancialRules,
  PERIOD_DAYS,
  periodDaysForFrequency,
  propertySettingsToOverride,
  resolveFinancialRules,
  capMergedLateFeePercent,
  type ResolvedFinancialRules,
} from '../../utils/globalSettings.util';
import { OverdueAnalysis, PaymentFrequencyCalc, OverdueBill, OverdueRent } from '../../validations/interfaces/bills.interface';


class TenantBills {
    async getTenantBills(tenantId: string) {
        const scope = await resolveTenantBillAccessScope(tenantId);
        return prismaClient.billsSubCategory.findMany({
          where: buildTenantAccessibleBillWhere(
            scope.tenantId,
            scope.propertyId,
            scope.includePropertyWideBills
          ),
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
    
      async getUpcomingBills(tenantId: string, days: number = 30) {
        const scope = await resolveTenantBillAccessScope(tenantId);
        const today = new Date();
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
        return prismaClient.billsSubCategory.findMany({
          where: {
            ...buildTenantAccessibleBillWhere(
              scope.tenantId,
              scope.propertyId,
              scope.includePropertyWideBills
            ),
            dueDate: {
              gte: today,
              lte: futureDate
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
    
      async getOverdueBills(tenantId: string) {
        const scope = await resolveTenantBillAccessScope(tenantId);
        const today = new Date(); 
        return prismaClient.billsSubCategory.findMany({
          where: {
            ...buildTenantAccessibleBillWhere(
              scope.tenantId,
              scope.propertyId,
              scope.includePropertyWideBills
            ),
            dueDate: {
              lt: today
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }

   /**
   * Get comprehensive overdue analysis for a tenant
   */
  async getTenantOverdueAnalysis(tenantId: string): Promise<OverdueAnalysis> {
    try {
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        include: {
          user: {
            select: {
              email: true,
              profile: true
            }
          },
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              price: true,
              priceFrequency: true,
              landlordId: true,
            }
          },
          unit: {
            select: {
              id: true,
              unitType: true,
              unitNumber: true,
              price: true,
              priceFrequency: true
            }
          },
          room: {
            select: {
              id: true,
              roomName: true,
              price: true,
              priceFrequency: true
            }
          }
        }
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const rentAmount = this.getRentAmount(tenant);
      const rentFrequency = this.getRentFrequency(tenant);
      const billScope = await resolveTenantBillAccessScope(tenantId);
      const [
        globalSettings,
        propertyLateFee,
        tenantBills,
        rentPaymentHistory,
        tenantTransactions,
      ] = await Promise.all([
        LandlordSettingsService.getAllGlobalSettings(tenant.property.landlordId),
        LandlordSettingsService.getPropertyLateFeeOverride(tenant.property.id),
        prismaClient.billsSubCategory.findMany({
          where: {
            ...buildTenantAccessibleBillWhere(
              billScope.tenantId,
              billScope.propertyId,
              billScope.includePropertyWideBills
            ),
          },
          include: {
            bills: true,
            transactions: {
              where: {
                status: 'COMPLETED'
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }),
        prismaClient.tenantPaymentHistory.findMany({
          where: {
            tenantId
          },
          orderBy: {
            rentStartDate: 'desc'
          }
        }),
        prismaClient.transaction.findMany({
          where: {
            userId: tenant.userId,
            status: 'COMPLETED'
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
      ]);

      const baseRules = resolveFinancialRules(globalSettings, rentAmount, rentFrequency);
      const rules = capMergedLateFeePercent(
        mergeFinancialRules(
          baseRules,
          propertySettingsToOverride(propertyLateFee)
        ),
        rentAmount
      );

      const overdueBills = this.analyzeOverdueBills(tenantBills, tenantTransactions, rules);
      const overdueRent = this.analyzeOverdueRent(tenant, rentPaymentHistory, rules);
      const summary = this.calculateSummary(overdueBills, overdueRent, rules, rentFrequency);

      return {
        tenant: {
          id: tenant.id,
          name: this.getTenantName(tenant),
          email: tenant.user.email,
        },
        property: {
          id: tenant.property.id,
          name: tenant.property.name,
          address: tenant.property.address
        },
        unit: tenant.unit ? {
          id: tenant.unit.id,
          unitType: tenant.unit.unitType,
          unitNumber: tenant.unit.unitNumber || undefined
        } : undefined,
        room: tenant.room ? {
          id: tenant.room.id,
          roomName: tenant.room.roomName
        } : undefined,
        leaseInfo: {
          startDate: tenant.leaseStartDate!,
          endDate: tenant.leaseEndDate!,
          isCurrentLease: tenant.isCurrentLease,
          rentAmount,
          rentFrequency
        },
        overdueBills,
        overdueRent,
        summary
      };
    } catch (error) {
      throw new Error(`Failed to get tenant overdue analysis: ${error.message}`);
    }
  }

  private analyzeOverdueBills(
    bills: any[],
    transactions: any[],
    rules: ResolvedFinancialRules
  ): OverdueBill[] {
    const overdueBills: OverdueBill[] = [];
    const now = new Date();

    for (const bill of bills) {
      const billTransactions = bill.transactions || [];
      const lastPaidTransaction = billTransactions[0];
      const lastPaidDate = lastPaidTransaction?.createdAt;

      const dueDates = this.calculateDueDates(
        bill.dueDate,
        bill.billFrequency,
        lastPaidDate,
        now
      );

      for (const dueDate of dueDates) {
        if (dueDate < now) {
          const wasPaid = this.wasBillPaidForPeriod(
            billTransactions,
            dueDate,
            bill.billFrequency
          );

          if (!wasPaid) {
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const lateFeeAmount = computeLateFee(rules, Number(bill.amount), daysOverdue);
            const totalAmountDue = Number(bill.amount) + lateFeeAmount;

            let nextDueDate: Date | undefined;
            if (bill.billFrequency !== PaymentFrequency.ANNUALLY) {
              nextDueDate = this.calculateNextDueDate(dueDate, bill.billFrequency);
            }

            overdueBills.push({
              id: bill.id,
              billName: bill.billName,
              billCategory: bill.bills?.name || 'Unknown',
              amount: Number(bill.amount),
              dueDate,
              frequency: bill.billFrequency,
              payableBy: bill.payableBy,
              daysOverdue,
              lateFeeAmount,
              totalAmountDue,
              lastPaidDate: lastPaidDate || undefined,
              nextDueDate,
              transactionHistory: billTransactions
            });

            if (bill.billFrequency !== PaymentFrequency.ANNUALLY) {
              break;
            }
          }
        }
      }
    }

    return overdueBills.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  private analyzeOverdueRent(
    tenant: any,
    paymentHistory: any[],
    rules: ResolvedFinancialRules
  ): OverdueRent[] {
    const overdueRent: OverdueRent[] = [];
    const now = new Date();
    const rentAmount = this.getRentAmount(tenant);
    const rentFrequency = this.getRentFrequency(tenant);

    if (!tenant.leaseStartDate || !tenant.dateOfFirstRent) {
      return overdueRent;
    }

    const rentPeriods = this.generateRentPeriods(
      tenant.dateOfFirstRent,
      tenant.leaseEndDate || new Date(),
      rentFrequency
    );

    for (const period of rentPeriods) {
      if (period.dueDate < now) {
        const periodPayment = paymentHistory.find(payment => 
          this.isSameRentPeriod(payment.rentStartDate, period.startDate, rentFrequency)
        );

        const paidAmount = periodPayment ? Number(periodPayment.amountPaid) : 0;
        const isFullyPaid = paidAmount >= rentAmount;
        const isPartiallyPaid = paidAmount > 0 && paidAmount < rentAmount;

        if (!isFullyPaid) {
          const daysOverdue = Math.floor((now.getTime() - period.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const lateFeeAmount = computeLateFee(rules, rentAmount, daysOverdue);
          const totalAmountDue = rentAmount - paidAmount + lateFeeAmount;

          overdueRent.push({
            period: period.periodName,
            dueDate: period.dueDate,
            amount: rentAmount,
            daysOverdue,
            lateFeeAmount,
            totalAmountDue,
            status: isPartiallyPaid ? 'partial' : 'unpaid',
            paidAmount: isPartiallyPaid ? paidAmount : undefined
          });
        }
      }
    }

    return overdueRent.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  private calculateDueDates(
    initialDueDate: Date,
    frequency: PaymentFrequency,
    lastPaidDate: Date | null,
    endDate: Date
  ): Date[] {
    const dueDates: Date[] = [];
    const frequencyConfig = this.getFrequencyConfig(frequency);
    let currentDate = lastPaidDate ? new Date(lastPaidDate) : new Date(initialDueDate);

    if (lastPaidDate) {
      currentDate = new Date(lastPaidDate.getTime() + frequencyConfig.milliseconds);
    }

    while (currentDate <= endDate) {
      dueDates.push(new Date(currentDate));
      currentDate = new Date(currentDate.getTime() + frequencyConfig.milliseconds);
    }

    return dueDates;
  }

  private generateRentPeriods(
    startDate: Date,
    endDate: Date,
    frequency: PriceFrequency
  ): { startDate: Date; dueDate: Date; periodName: string }[] {
    const periods: { startDate: Date; dueDate: Date; periodName: string }[] = [];
    const frequencyConfig = this.getFrequencyConfig(frequency);
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const periodEnd = new Date(currentDate.getTime() + frequencyConfig.milliseconds);
      const dueDate = new Date(currentDate); 
      
      periods.push({
        startDate: new Date(currentDate),
        dueDate,
        periodName: this.getPeriodName(currentDate, frequency)
      });

      currentDate = periodEnd;
    }

    return periods;
  }

  private wasBillPaidForPeriod(
    transactions: any[],
    dueDate: Date,
    frequency: PaymentFrequency
  ): boolean {
    const frequencyConfig = this.getFrequencyConfig(frequency);
    
    return transactions.some(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      const periodStart = new Date(dueDate.getTime() - frequencyConfig.milliseconds);
      const periodEnd = new Date(dueDate.getTime() + frequencyConfig.milliseconds);
      
      return transactionDate >= periodStart && transactionDate <= periodEnd;
    });
  }

  private getFrequencyConfig(frequency: PaymentFrequency | PriceFrequency): PaymentFrequencyCalc {
    const dayMs = 24 * 60 * 60 * 1000;
    const configs: Record<PaymentFrequency | PriceFrequency, PaymentFrequencyCalc> = {
      DAILY: { milliseconds: PERIOD_DAYS.DAILY * dayMs, description: 'Daily' },
      WEEKLY: { milliseconds: PERIOD_DAYS.WEEKLY * dayMs, description: 'Weekly' },
      MONTHLY: { milliseconds: PERIOD_DAYS.MONTHLY * dayMs, description: 'Monthly' },
      QUARTERLY: { milliseconds: PERIOD_DAYS.QUARTERLY * dayMs, description: 'Quarterly' },
      ANNUALLY: { milliseconds: PERIOD_DAYS.ANNUALLY * dayMs, description: 'Annually' },
      PER_SQFT: { milliseconds: PERIOD_DAYS.PER_SQFT * dayMs, description: 'Per Sq Ft' },
      YEARLY: { milliseconds: PERIOD_DAYS.ANNUALLY * dayMs, description: 'Yearly' },
    };

    return configs[frequency] || configs.MONTHLY;
  }

  private getPeriodName(date: Date, frequency: PriceFrequency): string {
    switch (frequency) {
      case PriceFrequency.DAILY:
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case PriceFrequency.WEEKLY:
        return `Week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      case PriceFrequency.MONTHLY:
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case PriceFrequency.QUARTERLY: {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      }
      case PriceFrequency.ANNUALLY:
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  private isSameRentPeriod(date1: Date, date2: Date, frequency: PriceFrequency): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    switch (frequency) {
      case PriceFrequency.DAILY:
        return d1.toDateString() === d2.toDateString();
      case PriceFrequency.WEEKLY: {
        const week1 = this.getWeekNumber(d1);
        const week2 = this.getWeekNumber(d2);
        return week1 === week2 && d1.getFullYear() === d2.getFullYear();
      }
      case PriceFrequency.MONTHLY:
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
      case PriceFrequency.QUARTERLY: {
        const quarter1 = Math.floor(d1.getMonth() / 3);
        const quarter2 = Math.floor(d2.getMonth() / 3);
        return quarter1 === quarter2 && d1.getFullYear() === d2.getFullYear();
      }
      case PriceFrequency.ANNUALLY:
        return d1.getFullYear() === d2.getFullYear();
      default:
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private calculateNextDueDate(currentDueDate: Date, frequency: PaymentFrequency): Date {
    const config = this.getFrequencyConfig(frequency);
    return new Date(currentDueDate.getTime() + config.milliseconds);
  }

  private getTenantName(tenant: any): string {
    if (tenant.user.profile) {
      return `${tenant.user.profile.firstName} ${tenant.user.profile.lastName}`;
    }
    return tenant.tenantWebUserEmail || 'Unknown Tenant';
  }

  private getRentAmount(tenant: any): number {
    if (tenant.unit?.price) {
      return parseFloat(tenant.unit.price) || 0;
    }
    if (tenant.room?.price) {
      return parseFloat(tenant.room.price) || 0;
    }
    if (tenant.property?.price) {
      return parseFloat(tenant.property.price) || 0;
    }
    return 0;
  }

  private getRentFrequency(tenant: any): PriceFrequency {
    if (tenant.unit?.priceFrequency) {
      return tenant.unit.priceFrequency;
    }
    if (tenant.room?.priceFrequency) {
      return tenant.room.priceFrequency;
    }
    if (tenant.property?.priceFrequency) {
      return tenant.property.priceFrequency;
    }
    return PriceFrequency.MONTHLY;
  }

  private calculateSummary(
    overdueBills: OverdueBill[],
    overdueRent: OverdueRent[],
    rules: ResolvedFinancialRules,
    rentFrequency: PriceFrequency
  ) {
    const totalOverdueBills = overdueBills.reduce((sum, bill) => sum + bill.totalAmountDue, 0);
    const totalOverdueRent = overdueRent.reduce((sum, rent) => sum + rent.totalAmountDue, 0);
    const totalOverdueAmount = totalOverdueBills + totalOverdueRent;

    const allOverdueItems = [...overdueBills, ...overdueRent];
    const mostOverdueDays = allOverdueItems.length > 0 
      ? Math.max(...allOverdueItems.map(item => item.daysOverdue))
      : 0;

    return {
      totalOverdueAmount,
      totalOverdueBills: overdueBills.length,
      totalOverdueRent: overdueRent.length,
      mostOverdueDays,
      gracePeriodDays: rules.graceDays,
      periodDays: periodDaysForFrequency(rentFrequency),
      lateFeeSettings: {
        lateFee: rules.lateFeeFixed > 0 ? rules.lateFeeFixed : rules.lateFeeAmount,
        lateFeePercentage: rules.lateFeePercent,
        gracePeriodDays: rules.graceDays,
        lateFeeEnabled: rules.lateFeeEnabled,
        lateFeeFrequency: rules.lateFeeFrequency,
      },
    };
  }
}

export default new TenantBills();
