
import {  PaymentFrequency, PayableBy, PriceFrequency, LatePaymentFeeType } from '@prisma/client';
import { prismaClient } from "../..";
import { OverdueAnalysis,PaymentFrequencyCalc, OverdueBill, OverdueRent } from '../../validations/interfaces/bills.interface';


class TenantBills {
    async getTenantBills(tenantId: string) {
        return prismaClient.billsSubCategory.findMany({
          where: {
            tenantId
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
      }
    
      async getUpcomingBills(tenantId: string, days: number = 30) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
        return prismaClient.billsSubCategory.findMany({
          where: {
            tenantId,
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
        const today = new Date(); 
        return prismaClient.billsSubCategory.findMany({
          where: {
            tenantId,
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
      // Get tenant basic information
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
              settings: {
                where: {
                  settingType: 'LATEFEE'
                }
              }
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

      // Get all bills for the tenant
      const tenantBills = await prismaClient.billsSubCategory.findMany({
        where: {
          tenantId: tenantId,
          isDeleted: false
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
      });

      // Get rent payment history
      const rentPaymentHistory = await prismaClient.tenantPaymentHistory.findMany({
        where: {
          tenantId: tenantId
        },
        orderBy: {
          rentStartDate: 'desc'
        }
      });

      // Get all transactions for the tenant
      const tenantTransactions = await prismaClient.transaction.findMany({
        where: {
          userId: tenant.userId,
          status: 'COMPLETED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Analyze overdue bills
      const overdueBills = await this.analyzeOverdueBills(tenantBills, tenantTransactions);

      // Analyze overdue rent
      const overdueRent = this.analyzeOverdueRent(tenant, rentPaymentHistory);

      // Calculate summary
      const summary = this.calculateSummary(overdueBills, overdueRent, tenant.property.settings[0]);

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
          rentAmount: this.getRentAmount(tenant),
          rentFrequency: this.getRentFrequency(tenant)
        },
        overdueBills,
        overdueRent,
        summary
      };
    } catch (error) {
      throw new Error(`Failed to get tenant overdue analysis: ${error.message}`);
    }
  }

  /**
   * Analyze overdue bills considering frequencies and payment history
   */
  private async analyzeOverdueBills(
    bills: any[],
    transactions: any[]
  ): Promise<OverdueBill[]> {
    const overdueBills: OverdueBill[] = [];
    const now = new Date();

    for (const bill of bills) {
      const frequencyConfig = this.getFrequencyConfig(bill.billFrequency);
      const billTransactions = bill.transactions || [];
      
      // Get the last paid date for this bill
      const lastPaidTransaction = billTransactions[0];
      const lastPaidDate = lastPaidTransaction?.createdAt;

      // Calculate due dates based on frequency
      const dueDates = this.calculateDueDates(
        bill.dueDate,
        bill.billFrequency,
        lastPaidDate,
        now
      );

      for (const dueDate of dueDates) {
        if (dueDate < now) {
          // Check if this due date was paid
          const wasPaid = this.wasBillPaidForPeriod(
            billTransactions,
            dueDate,
            bill.billFrequency
          );

          if (!wasPaid) {
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const lateFeeAmount = this.calculateLateFee(bill.amount, daysOverdue);
            const totalAmountDue = Number(bill.amount) + lateFeeAmount;

            // Calculate next due date for recurring bills
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

            // For recurring bills, we only show the most recent overdue instance
            if (bill.billFrequency !== PaymentFrequency.ANNUALLY) {
              break;
            }
          }
        }
      }
    }

    return overdueBills.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /**
   * Analyze overdue rent payments
   */
  private analyzeOverdueRent(tenant: any, paymentHistory: any[]): OverdueRent[] {
    const overdueRent: OverdueRent[] = [];
    const now = new Date();
    const rentAmount = this.getRentAmount(tenant);
    const rentFrequency = this.getRentFrequency(tenant);

    if (!tenant.leaseStartDate || !tenant.dateOfFirstRent) {
      return overdueRent;
    }

    // Generate expected rent periods
    const rentPeriods = this.generateRentPeriods(
      tenant.dateOfFirstRent,
      tenant.leaseEndDate || new Date(),
      rentFrequency
    );

    for (const period of rentPeriods) {
      if (period.dueDate < now) {
        // Find payment for this period
        const periodPayment = paymentHistory.find(payment => 
          this.isSameRentPeriod(payment.rentStartDate, period.startDate, rentFrequency)
        );

        const paidAmount = periodPayment ? Number(periodPayment.amountPaid) : 0;
        const isFullyPaid = paidAmount >= rentAmount;
        const isPartiallyPaid = paidAmount > 0 && paidAmount < rentAmount;

        if (!isFullyPaid) {
          const daysOverdue = Math.floor((now.getTime() - period.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const lateFeeAmount = this.calculateRentLateFee(rentAmount, daysOverdue);
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

  /**
   * Calculate due dates based on frequency and payment history
   */
  private calculateDueDates(
    initialDueDate: Date,
    frequency: PaymentFrequency,
    lastPaidDate: Date | null,
    endDate: Date
  ): Date[] {
    const dueDates: Date[] = [];
    const frequencyConfig = this.getFrequencyConfig(frequency);
    let currentDate = lastPaidDate ? new Date(lastPaidDate) : new Date(initialDueDate);

    // If there's a last paid date, start from the next period after last payment
    if (lastPaidDate) {
      currentDate = new Date(lastPaidDate.getTime() + frequencyConfig.milliseconds);
    }

    while (currentDate <= endDate) {
      dueDates.push(new Date(currentDate));
      currentDate = new Date(currentDate.getTime() + frequencyConfig.milliseconds);
    }

    return dueDates;
  }

  /**
   * Generate rent periods based on lease dates and frequency
   */
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
      const dueDate = new Date(currentDate); // Rent is typically due at start of period
      
      periods.push({
        startDate: new Date(currentDate),
        dueDate,
        periodName: this.getPeriodName(currentDate, frequency)
      });

      currentDate = periodEnd;
    }

    return periods;
  }

  /**
   * Check if a bill was paid for a specific period
   */
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

  /**
   * Calculate late fees for bills
   */
  private calculateLateFee(amount: number, daysOverdue: number): number {
    // Default late fee calculation: 5% of amount + 1% per day overdue
    const baseLateFee = amount * 0.05;
    const dailyLateFee = amount * 0.01 * daysOverdue;
    return baseLateFee + dailyLateFee;
  }

  /**
   * Calculate late fees for rent
   */
  private calculateRentLateFee(rentAmount: number, daysOverdue: number): number {
    // Rent late fee: 10% of rent + 2% per day overdue
    const baseLateFee = rentAmount * 0.10;
    const dailyLateFee = rentAmount * 0.02 * daysOverdue;
    return baseLateFee + dailyLateFee;
  }

  /**
   * Get frequency configuration
   */
  private getFrequencyConfig(frequency: PaymentFrequency | PriceFrequency): PaymentFrequencyCalc {
    const configs: Record<PaymentFrequency | PriceFrequency, PaymentFrequencyCalc> = {
      DAILY: { milliseconds: 24 * 60 * 60 * 1000, description: 'Daily' },
      WEEKLY: { milliseconds: 7 * 24 * 60 * 60 * 1000, description: 'Weekly' },
      MONTHLY: { milliseconds: 30 * 24 * 60 * 60 * 1000, description: 'Monthly' },
      QUARTERLY: { milliseconds: 90 * 24 * 60 * 60 * 1000, description: 'Quarterly' },
      ANNUALLY: { milliseconds: 365 * 24 * 60 * 60 * 1000, description: 'Annually' },
      YEARLY: { milliseconds: 365 * 24 * 60 * 60 * 1000, description: 'Yearly' },
      PER_SQFT: { milliseconds: 30 * 24 * 60 * 60 * 1000, description: 'Per Sq Ft' }
    };

    return configs[frequency] || configs.MONTHLY;
  }

  /**
   * Get period name for rent periods
   */
  private getPeriodName(date: Date, frequency: PriceFrequency): string {
    switch (frequency) {
      case PriceFrequency.DAILY:
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case PriceFrequency.WEEKLY:
        return `Week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      case PriceFrequency.MONTHLY:
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case PriceFrequency.QUARTERLY:
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      case PriceFrequency.ANNUALLY:
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  /**
   * Check if two dates are in the same rent period
   */
  private isSameRentPeriod(date1: Date, date2: Date, frequency: PriceFrequency): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    switch (frequency) {
      case PriceFrequency.DAILY:
        return d1.toDateString() === d2.toDateString();
      case PriceFrequency.WEEKLY:
        const week1 = this.getWeekNumber(d1);
        const week2 = this.getWeekNumber(d2);
        return week1 === week2 && d1.getFullYear() === d2.getFullYear();
      case PriceFrequency.MONTHLY:
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
      case PriceFrequency.QUARTERLY:
        const quarter1 = Math.floor(d1.getMonth() / 3);
        const quarter2 = Math.floor(d2.getMonth() / 3);
        return quarter1 === quarter2 && d1.getFullYear() === d2.getFullYear();
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
    if (tenant.unit) {
      return parseFloat(tenant.unit.price) || 0;
    }
    if (tenant.room) {
      return parseFloat(tenant.room.price) || 0;
    }
    return 0;
  }

  private getRentFrequency(tenant: any): PriceFrequency {
    if (tenant.unit) {
      return tenant.unit.priceFrequency || PriceFrequency.MONTHLY;
    }
    if (tenant.room) {
      return tenant.room.priceFrequency || PriceFrequency.MONTHLY;
    }
    return PriceFrequency.MONTHLY;
  }

  private calculateSummary(
    overdueBills: OverdueBill[],
    overdueRent: OverdueRent[],
    lateFeeSettings?: any
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
      gracePeriodDays: lateFeeSettings?.gracePeriodDays || 5,
      lateFeeSettings: lateFeeSettings ? {
        lateFee: Number(lateFeeSettings.lateFee) || 0,
        lateFeeFrequency: lateFeeSettings.lateFeeFrequency || LatePaymentFeeType.DAILY,
        lateFeePercentage: lateFeeSettings.lateFeePercentage || 0,
        gracePeriodDays: lateFeeSettings.gracePeriodDays || 5
      } : undefined
    };
  }
}


export default new TenantBills();