import { PayableBy, PaymentFrequency, PriceFrequency } from '@prisma/client';
import { prismaClient, serverInstance } from '..';
import billServices from '../landlord/services/bill.services';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import {
  capMergedLateFeePercent,
  isRentBillRecord,
  mergeFinancialRules,
  overduePeriodsAfterGrace,
  propertySettingsToOverride,
  resolveFinancialRules,
} from '../utils/globalSettings.util';
import loggers from '../utils/loggers';

const LATE_FEE_MARKER = 'late-fee-for:';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isBillPaid(bill: {
  transactions?: { status: string }[];
}): boolean {
  return (bill.transactions ?? []).some((tx) => tx.status === 'COMPLETED');
}

function lateFeeDescription(sourceBillId: string, periodKey: string): string {
  return `${LATE_FEE_MARKER}${sourceBillId}:${periodKey}`;
}

export function parseLateFeeSourceBillId(description?: string | null): string | null {
  if (!description?.startsWith(LATE_FEE_MARKER)) return null;
  const rest = description.slice(LATE_FEE_MARKER.length);
  const colon = rest.indexOf(':');
  return colon >= 0 ? rest.slice(0, colon) : null;
}

class LateFeeChargeService {
  async chargeOverdueLateFees(): Promise<number> {
    const today = startOfDay(new Date());
    const overdueBills = await prismaClient.billsSubCategory.findMany({
      where: {
        dueDate: { lt: today },
        isDeleted: false,
        payableBy: PayableBy.TENANT,
        tenantId: { not: null },
        landlordId: { not: null },
      },
      include: {
        bills: true,
        property: { select: { price: true, priceFrequency: true, currency: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 500,
    });

    const settingsCache = new Map<string, Awaited<ReturnType<typeof LandlordSettingsService.getAllGlobalSettings>>>();
    let created = 0;

    for (const bill of overdueBills) {
      if (!bill.landlordId || !bill.tenantId) continue;
      if (isBillPaid(bill)) continue;
      if (parseLateFeeSourceBillId(bill.description)) continue;

      let settings = settingsCache.get(bill.landlordId);
      if (!settings) {
        settings = await LandlordSettingsService.getAllGlobalSettings(bill.landlordId);
        settingsCache.set(bill.landlordId, settings);
      }

      const frequency =
        bill.property?.priceFrequency ??
        (isRentBillRecord(bill) ? PriceFrequency.MONTHLY : PriceFrequency.MONTHLY);
      const rentBase = Number(bill.property?.price ?? bill.amount);
      let rules = resolveFinancialRules(settings, rentBase, frequency);

      const propertyLateFee = bill.propertyId
        ? await LandlordSettingsService.getPropertyLateFeeOverride(bill.propertyId)
        : null;
      rules = capMergedLateFeePercent(
        mergeFinancialRules(rules, propertySettingsToOverride(propertyLateFee)),
        Number(bill.amount)
      );

      if (!rules.lateFeeEnabled) continue;

      const daysOverdue = Math.ceil(
        (today.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysAfterGrace = Math.max(0, daysOverdue - rules.graceDays);
      if (daysAfterGrace <= 0) continue;

      const overduePeriods = overduePeriodsAfterGrace(
        daysAfterGrace,
        rules.lateFeeFrequency
      );
      const unitFee =
        rules.lateFeeFixed > 0
          ? rules.lateFeeFixed
          : (rules.lateFeePercent / 100) * Number(bill.amount);
      if (unitFee <= 0) continue;

      const feeAmount = unitFee * overduePeriods;
      const periodKey = startOfDay(new Date(bill.dueDate)).toISOString().slice(0, 10);
      const marker = lateFeeDescription(bill.id, `${periodKey}:p${overduePeriods}`);

      const existing = await prismaClient.billsSubCategory.findFirst({
        where: {
          isDeleted: false,
          tenantId: bill.tenantId,
          description: marker,
        },
        select: { id: true },
      });
      if (existing) continue;

      let categoryId = bill.billCategoryId;
      const feesCategory = await prismaClient.bills.findFirst({
        where: {
          isDeleted: false,
          name: { contains: 'fee', mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (feesCategory) categoryId = feesCategory.id;

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);

      const lateFeeBill = await billServices.createSubBills(
        {
          billName: `Late fee — ${bill.billName}`,
          description: marker,
          amount: feeAmount,
          billFrequency: PaymentFrequency.ANNUALLY,
          dueDate,
          payableBy: PayableBy.TENANT,
          propertyId: bill.propertyId,
          tenantId: bill.tenantId,
          billCategoryId: categoryId,
        },
        bill.landlordId
      );

      created += 1;

      if (serverInstance.paymentNotificationService && lateFeeBill?.id) {
        try {
          await serverInstance.paymentNotificationService.sendNewBillNotification(
            lateFeeBill.id
          );
        } catch (notifyError) {
          loggers.error('Failed to notify late fee bill:', notifyError);
        }
      }
    }

    if (created > 0) {
      loggers.info(`Created ${created} late fee bill(s)`);
    }

    return created;
  }
}

export default new LateFeeChargeService();
