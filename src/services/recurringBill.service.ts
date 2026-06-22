import { PayableBy, PaymentFrequency } from '@prisma/client';
import { prismaClient, serverInstance } from '..';
import billServices from '../landlord/services/bill.services';
import loggers from '../utils/loggers';

const RECURRING_FREQUENCIES: PaymentFrequency[] = [
  PaymentFrequency.DAILY,
  PaymentFrequency.WEEKLY,
  PaymentFrequency.MONTHLY,
  PaymentFrequency.QUARTERLY,
  PaymentFrequency.YEARLY,
  PaymentFrequency.ANNUALLY,
];

const RECURRING_BILL_CONCURRENCY = 5;

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex++];
        await worker(item);
      }
    })
  );
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addBillFrequency(date: Date, frequency: PaymentFrequency): Date {
  const next = new Date(date);
  switch (frequency) {
    case PaymentFrequency.DAILY:
      next.setDate(next.getDate() + 1);
      break;
    case PaymentFrequency.WEEKLY:
      next.setDate(next.getDate() + 7);
      break;
    case PaymentFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      break;
    case PaymentFrequency.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      break;
    case PaymentFrequency.YEARLY:
    case PaymentFrequency.ANNUALLY:
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      break;
  }
  return next;
}

function seriesWhere(bill: {
  billName: string;
  billCategoryId: string;
  tenantId: string | null;
  propertyId: string | null;
  landlordId: string | null;
}) {
  return {
    isDeleted: false,
    billName: bill.billName,
    billCategoryId: bill.billCategoryId,
    tenantId: bill.tenantId,
    propertyId: bill.propertyId,
    landlordId: bill.landlordId,
  };
}

function seriesKey(bill: {
  billName: string;
  billCategoryId: string;
  tenantId: string | null;
  propertyId: string | null;
  landlordId: string | null;
}): string {
  return JSON.stringify([
    bill.billName,
    bill.billCategoryId,
    bill.tenantId,
    bill.propertyId,
    bill.landlordId,
  ]);
}

class RecurringBillService {
  /**
   * For each recurring bill series, create the next period bill when the latest
   * due date has passed and no successor exists yet.
   */
  async generateDueRecurringBills(): Promise<{ created: number; examined: number }> {
    const today = endOfDay(new Date());
    let created = 0;

    const candidates = await prismaClient.billsSubCategory.findMany({
      where: {
        isDeleted: false,
        payableBy: PayableBy.TENANT,
        billFrequency: { in: RECURRING_FREQUENCIES },
        landlordId: { not: null },
      },
      orderBy: { dueDate: 'asc' },
    });

    const series = new Map<string, typeof candidates>();
    for (const bill of candidates) {
      const key = seriesKey(bill);
      const bills = series.get(key);
      if (bills) {
        bills.push(bill);
      } else {
        series.set(key, [bill]);
      }
    }

    await runWithConcurrency(
      Array.from(series.values()),
      RECURRING_BILL_CONCURRENCY,
      async (seriesBills) => {
        // A series stays sequential so a newly created successor is visible to
        // later checks in the same series and deduplication remains intact.
        for (const bill of seriesBills) {
          const laterInSeries = await prismaClient.billsSubCategory.findFirst({
            where: {
              ...seriesWhere(bill),
              dueDate: { gt: bill.dueDate },
            },
            select: { id: true },
          });
          if (laterInSeries) continue;

          if (!bill.landlordId) continue;

          let cursor = new Date(bill.dueDate);
          let nextDue = addBillFrequency(cursor, bill.billFrequency);

          while (nextDue <= today) {
            const exists = await prismaClient.billsSubCategory.findFirst({
              where: {
                ...seriesWhere(bill),
                dueDate: {
                  gte: startOfDay(nextDue),
                  lte: endOfDay(nextDue),
                },
              },
              select: { id: true },
            });

            if (!exists) {
              const newBill = await billServices.createSubBills(
                {
                  billName: bill.billName,
                  billCategoryId: bill.billCategoryId,
                  description: bill.description,
                  amount: Number(bill.amount),
                  billFrequency: bill.billFrequency,
                  dueDate: nextDue,
                  payableBy: bill.payableBy,
                  propertyId: bill.propertyId ?? undefined,
                  tenantId: bill.tenantId ?? undefined,
                },
                bill.landlordId
              );

              if (serverInstance.paymentNotificationService) {
                await serverInstance.paymentNotificationService.sendNewBillNotification(newBill.id);
              }
              created++;
            }

            cursor = nextDue;
            nextDue = addBillFrequency(cursor, bill.billFrequency);
          }
        }
      }
    );

    loggers.info(`Recurring bill generation complete: ${created} created from ${candidates.length} series`);
    return { created, examined: candidates.length };
  }
}

export default new RecurringBillService();
