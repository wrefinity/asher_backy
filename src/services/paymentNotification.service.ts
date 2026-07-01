import { Server as IOServer } from "socket.io";
import { prismaClient } from "..";
import {
  Currency,
  NotificationCategory,
  PriceFrequency,
  ReminderMethodType,
  TransactionReference,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import loggers from "../utils/loggers";
import LandlordSettingsService from "../landlord/services/propertySetting.service";
import {
  normalizeReminderMethods,
  resolveFinancialRules,
} from "../utils/globalSettings.util";
import sendMail from "../utils/emailer";
import type { IGlobalSetting } from "../landlord/validations/interfaces/propsSettings";

export interface PaymentNotification {
  type: 'payment_success' | 'payment_failed' | 'bill_due' | 'bill_overdue' | 'payment_reminder' | 'bill_created' | 'rent_adjusted';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
}

type BillWithRelations = {
  id: string;
  billName: string;
  amount: { toNumber?: () => number } | number;
  dueDate: Date;
  landlordId?: string | null;
  tenantId?: string | null;
  property?: { name?: string | null; currency?: Currency | null } | null;
  tenants?: { user?: { id: string; email?: string | null } | null } | null;
  landlord?: { user?: { id: string } | null } | null;
};

const BILL_REMINDER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const NOTIFICATION_CONCURRENCY = 5;

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

function groupByKey<T>(
  items: readonly T[],
  getKey: (item: T) => string
): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.values());
}

function billReminderDedupMarker(billId: string): string {
  return `\u200B${billId}\u200B`;
}

export class PaymentNotificationService {
  private io: IOServer;

  constructor(io: IOServer) {
    this.io = io;
  }

  private async wasBillReminderSentRecently(
    destUserId: string,
    billId: string,
    titles: string[]
  ): Promise<boolean> {
    const since = new Date(Date.now() - BILL_REMINDER_COOLDOWN_MS);
    const marker = billReminderDedupMarker(billId);
    const recent = await prismaClient.notification.findFirst({
      where: {
        destId: destUserId,
        title: { in: titles },
        category: NotificationCategory.ONLINE_PAYMENTS,
        message: { contains: marker },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return recent != null;
  }

  private async recordBillReminderDedup(
    destUserId: string,
    billId: string,
    title: string
  ): Promise<void> {
    const marker = billReminderDedupMarker(billId);
    const existing = await prismaClient.notification.findFirst({
      where: {
        destId: destUserId,
        title,
        message: { contains: marker },
      },
      select: { id: true },
    });
    if (existing) return;

    await prismaClient.notification.create({
      data: {
        destId: destUserId,
        title,
        message: `Reminder recorded ${marker}`,
        category: NotificationCategory.ONLINE_PAYMENTS,
        isRead: true,
      },
    });
  }

  private async isBillPaid(
    billId: string,
    bill: { propertyId?: string | null; tenants?: { userId?: string | null } | null }
  ): Promise<boolean> {
    const tenantUserId = bill.tenants?.userId;
    if (!tenantUserId) return false;

    const paid = await prismaClient.transaction.findFirst({
      where: {
        reference: TransactionReference.BILL_PAYMENT,
        propertyId: bill.propertyId ?? undefined,
        userId: tenantUserId,
        status: TransactionStatus.COMPLETED,
        metadata: {
          path: ["billId"],
          equals: billId,
        },
      },
      select: { id: true },
    });
    return paid != null;
  }

  private formatAmount(
    amount: number | { toNumber?: () => number },
    currency?: Currency | string | null
  ): string {
    const value = typeof amount === "number" ? amount : Number(amount);
    const code = currency ? String(currency) : "NGN";
    return `${code} ${value.toLocaleString("en-GB", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  private resolveBillCurrency(bill: BillWithRelations): string {
    return bill.property?.currency ? String(bill.property.currency) : "NGN";
  }

  private resolveReminderMethods(
    settings?: Pick<IGlobalSetting, "reminderMethods"> | null
  ): ReminderMethodType[] {
    const normalized = normalizeReminderMethods(settings?.reminderMethods);
    if (normalized.length > 0) {
      return normalized;
    }

    return [
      ReminderMethodType.IN_APP,
      ReminderMethodType.PUSH,
      ReminderMethodType.EMAIL,
    ];
  }

  private shouldUseMethod(
    methods: ReminderMethodType[],
    method: ReminderMethodType
  ): boolean {
    return methods.includes(method);
  }

  private wantsEmail(methods: ReminderMethodType[]): boolean {
    return (
      this.shouldUseMethod(methods, ReminderMethodType.EMAIL) ||
      this.shouldUseMethod(methods, ReminderMethodType.SMS)
    );
  }

  private async deliverBillNotification(
    bill: BillWithRelations,
    notification: PaymentNotification,
    settings?: Pick<IGlobalSetting, "reminderMethods"> | null,
    recipient?: { id: string; email?: string | null }
  ): Promise<void> {
    const tenantUser = recipient ?? bill.tenants?.user;
    if (!tenantUser?.id) return;

    const methods = this.resolveReminderMethods(settings);
    const landlordUserId = bill.landlord?.user?.id ?? null;
    const pushRoute =
      (notification.data?.route as string | undefined) ?? "/bills/viewAllBills";

    if (this.shouldUseMethod(methods, ReminderMethodType.IN_APP)) {
      this.io.to(`user:${tenantUser.id}`).emit("payment_notification", notification);

      try {
        const NotificationService = (await import("./notification.service")).default;
        await NotificationService.createNotification(
          {
            sourceId: landlordUserId,
            destId: tenantUser.id,
            title: notification.title,
            message: notification.message,
          },
          "ONLINE_PAYMENTS"
        );
      } catch (persistError) {
        loggers.error("Failed to persist bill notification:", persistError);
      }
    }

    if (this.shouldUseMethod(methods, ReminderMethodType.PUSH)) {
      try {
        const expoPushService = (await import("./expoPush.service")).default;
        await expoPushService.sendToUser(tenantUser.id, {
          title: notification.title,
          body: notification.message,
          data: {
            type: notification.type,
            billId: bill.id,
            route: pushRoute,
          },
        });
      } catch (pushError) {
        loggers.error("Failed to send bill push notification:", pushError);
      }
    }

    if (this.wantsEmail(methods) && tenantUser.email) {
      try {
        await sendMail(
          tenantUser.email,
          notification.title,
          `<p>${notification.message}</p>`
        );
      } catch (emailError) {
        loggers.error("Failed to send bill email notification:", emailError);
      }
    }
  }

  /**
   * Send payment success notification to tenant
   */
  async sendPaymentSuccessNotification(
    userId: string, 
    billId: string, 
    amount: number, 
    billName: string,
    currency?: string | null
  ): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: {
          property: { select: { currency: true } },
          landlord: { include: { user: true } },
        },
      });
      const amountLabel = this.formatAmount(amount, currency ?? bill?.property?.currency);

      const notification: PaymentNotification = {
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of ${amountLabel} for ${billName} has been processed successfully.`,
        data: {
          billId,
          amount,
          billName,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      // Send to tenant's socket
      this.io.to(`user:${userId}`).emit('payment_notification', notification);
      
      if (bill?.landlord?.user) {
        const landlordNotification: PaymentNotification = {
          type: 'payment_success',
          title: 'Payment Received',
          message: `Payment of ${amountLabel} received for ${billName} from tenant.`,
          data: {
            billId,
            amount,
            billName,
            tenantId: bill.tenantId,
            timestamp: new Date()
          },
          timestamp: new Date()
        };

        this.io.to(`user:${bill.landlord.user.id}`).emit('payment_notification', landlordNotification);
      }

      loggers.info(`Payment success notification sent to user ${userId}`);
    } catch (error) {
      loggers.error('Error sending payment success notification:', error);
    }
  }

  /**
   * Send payment failure notification to tenant
   */
  async sendPaymentFailureNotification(
    userId: string, 
    billId: string, 
    amount: number, 
    billName: string, 
    reason: string,
    currency?: string | null
  ): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: { property: { select: { currency: true } } },
      });
      const amountLabel = this.formatAmount(amount, currency ?? bill?.property?.currency);

      const notification: PaymentNotification = {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ${amountLabel} for ${billName} failed. Reason: ${reason}`,
        data: {
          billId,
          amount,
          billName,
          reason,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('payment_notification', notification);
      loggers.info(`Payment failure notification sent to user ${userId}`);
    } catch (error) {
      loggers.error('Error sending payment failure notification:', error);
    }
  }

  /**
   * Send bill due reminder notification
   */
  async sendBillDueReminder(
    billId: string,
    settings?: Pick<IGlobalSetting, "reminderMethods"> | null
  ): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: {
          tenants: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          property: { select: { name: true, currency: true } },
          landlord: { include: { user: true } },
        },
      });

      if (!bill || !bill.tenants?.user) {
        loggers.warn(`Bill or tenant not found for reminder: ${billId}`);
        return;
      }

      if (await this.isBillPaid(billId, bill)) {
        loggers.info(`Skipping bill due reminder — bill already paid: ${billId}`);
        return;
      }

      const resolvedSettings =
        settings ??
        (bill.landlordId
          ? await LandlordSettingsService.getAllGlobalSettings(bill.landlordId)
          : null);

      const daysUntilDue = Math.ceil(
        (new Date(bill.dueDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const currency = this.resolveBillCurrency(bill);
      const amountLabel = this.formatAmount(bill.amount, currency);
      const messagePrefix = `Your ${bill.billName} bill of ${amountLabel}`;
      const dedupMarker = billReminderDedupMarker(billId);

      if (
        await this.wasBillReminderSentRecently(
          bill.tenants.user.id,
          billId,
          ["Bill Due Soon"]
        )
      ) {
        loggers.info(
          `Skipping bill due reminder — already sent within 30 days: ${billId}`
        );
        return;
      }

      const notification: PaymentNotification = {
        type: 'bill_due',
        title: 'Bill Due Soon',
        message: `${messagePrefix} is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}.${dedupMarker}`,
        data: {
          billId,
          billName: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          daysUntilDue,
          propertyName: bill.property?.name,
          currency,
          timestamp: new Date(),
          route: '/bills/viewAllBills',
        },
        timestamp: new Date(),
      };

      await this.deliverBillNotification(bill, notification, resolvedSettings);
      await this.recordBillReminderDedup(
        bill.tenants.user.id,
        billId,
        "Bill Due Soon"
      );
      loggers.info(`Bill due reminder sent to user ${bill.tenants.user.id}`);
    } catch (error) {
      loggers.error('Error sending bill due reminder:', error);
    }
  }

  /**
   * Send bill overdue notification
   */
  async sendBillOverdueNotification(billId: string): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: { 
          tenants: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          landlord: { include: { user: true } },
          property: { select: { name: true, currency: true } },
        }
      });

      if (!bill || !bill.tenants?.user) {
        loggers.warn(`Bill or tenant not found for overdue notification: ${billId}`);
        return;
      }

      if (await this.isBillPaid(billId, bill)) {
        loggers.info(`Skipping bill overdue notification — bill already paid: ${billId}`);
        return;
      }

      if (
        await this.wasBillReminderSentRecently(
          bill.tenants.user.id,
          billId,
          ["Bill Overdue"]
        )
      ) {
        loggers.info(
          `Skipping bill overdue notification — already sent within 30 days: ${billId}`
        );
        return;
      }

      const settings = bill.landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(bill.landlordId)
        : null;
      const currency = this.resolveBillCurrency(bill);
      const amountLabel = this.formatAmount(bill.amount, currency);
      const daysOverdue = Math.ceil((new Date().getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const dedupMarker = billReminderDedupMarker(billId);

      // Notify tenant
      const tenantNotification: PaymentNotification = {
        type: 'bill_overdue',
        title: 'Bill Overdue',
        message: `Your ${bill.billName} bill of ${amountLabel} is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.${dedupMarker}`,
        data: {
          billId,
          billName: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          daysOverdue,
          propertyName: bill.property?.name,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      await this.deliverBillNotification(bill, tenantNotification, settings);
      await this.recordBillReminderDedup(
        bill.tenants.user.id,
        billId,
        "Bill Overdue"
      );

      // Notify landlord
      if (bill.landlord?.user) {
        const landlordNotification: PaymentNotification = {
          type: 'bill_overdue',
          title: 'Tenant Bill Overdue',
          message: `Tenant's ${bill.billName} bill of ${amountLabel} is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.`,
          data: {
            billId,
            billName: bill.billName,
            amount: bill.amount,
            dueDate: bill.dueDate,
            daysOverdue,
            tenantId: bill.tenantId,
            propertyName: bill.property?.name,
            timestamp: new Date()
          },
          timestamp: new Date()
        };

        this.io.to(`user:${bill.landlord.user.id}`).emit('payment_notification', landlordNotification);
      }

      loggers.info(`Bill overdue notification sent to tenant ${bill.tenants.user.id} and landlord`);
    } catch (error) {
      loggers.error('Error sending bill overdue notification:', error);
    }
  }

  /**
   * Notify tenant(s) when a landlord creates or updates a payable bill.
   */
  async sendNewBillNotification(billId: string): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: {
          tenants: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          property: { select: { name: true, currency: true } },
          landlord: { include: { user: true } },
        },
      });

      if (!bill || bill.payableBy !== 'TENANT') {
        return;
      }

      const userIds = new Set<string>();

      if (bill.tenantId && bill.tenants?.user?.id) {
        userIds.add(bill.tenants.user.id);
      } else if (bill.propertyId) {
        const propertyTenants = await prismaClient.tenants.findMany({
          where: { propertyId: bill.propertyId, isCurrentLease: true },
          select: { userId: true },
        });
        propertyTenants.forEach((t) => userIds.add(t.userId));
      } else if (bill.landlordId) {
        const landlordTenants = await prismaClient.tenants.findMany({
          where: { landlordId: bill.landlordId, isCurrentLease: true },
          select: { userId: true },
        });
        landlordTenants.forEach((t) => userIds.add(t.userId));
      }

      if (userIds.size === 0) {
        return;
      }

      const settings = bill.landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(bill.landlordId)
        : null;
      const currency = this.resolveBillCurrency(bill);
      const amountLabel = this.formatAmount(bill.amount, currency);
      const dueLabel = new Date(bill.dueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const users = await prismaClient.users.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, email: true },
      });
      const userById = new Map(users.map((user) => [user.id, user]));

      await runWithConcurrency(
        Array.from(userIds),
        NOTIFICATION_CONCURRENCY,
        async (userId) => {
          const user = userById.get(userId);
          const notification: PaymentNotification = {
            type: 'bill_created',
            title: 'New Bill Added',
            message: `A new bill "${bill.billName}" of ${amountLabel} is due on ${dueLabel}.`,
            data: {
              billId: bill.id,
              billName: bill.billName,
              amount: bill.amount,
              dueDate: bill.dueDate,
              propertyName: bill.property?.name,
              currency,
              timestamp: new Date(),
              route: '/bills/viewAllBills',
            },
            timestamp: new Date(),
          };

          await this.deliverBillNotification(
            bill,
            notification,
            settings,
            user ?? { id: userId }
          );
        }
      );

      loggers.info(`New bill notification sent for bill ${billId} to ${userIds.size} tenant(s)`);
    } catch (error) {
      loggers.error('Error sending new bill notification:', error);
    }
  }

  /**
   * Send payment reminder notification (socket + in-app + push).
   */
  async sendPaymentReminderNotification(
    billId: string,
    reminderMessage?: string,
    landlordUserId?: string | null
  ): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: {
          tenants: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          property: { select: { name: true, currency: true } },
          landlord: { include: { user: true } },
        },
      });

      if (!bill || !bill.tenants?.user) {
        loggers.warn(`Bill or tenant not found for payment reminder: ${billId}`);
        return;
      }

      const dueLabel = new Date(bill.dueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const currency = this.resolveBillCurrency(bill);
      const amountLabel = this.formatAmount(bill.amount, currency);
      const settings = bill.landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(bill.landlordId)
        : null;

      const notification: PaymentNotification = {
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message:
          reminderMessage ||
          `Please pay your "${bill.billName}" bill of ${amountLabel} due on ${dueLabel}.`,
        data: {
          billId,
          billName: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          propertyName: bill.property?.name,
          currency,
          timestamp: new Date(),
          route: '/bills/viewAllBills',
        },
        timestamp: new Date(),
      };

      await this.deliverBillNotification(bill, notification, settings);

      loggers.info(`Payment reminder sent to user ${bill.tenants.user.id} for bill ${billId}`);
    } catch (error) {
      loggers.error('Error sending payment reminder notification:', error);
    }
  }

  /**
   * Check for bills due today and send reminders
   */
  async checkAndSendDueBillsReminders(): Promise<void> {
    try {
      const now = new Date();
      const settingsCache = new Map<
        string,
        Promise<Awaited<ReturnType<typeof LandlordSettingsService.getAllGlobalSettings>>>
      >();

      const upcomingBills = await prismaClient.billsSubCategory.findMany({
        where: {
          isDeleted: false,
          dueDate: { gte: now },
        },
        include: {
          tenants: { include: { user: true } },
          property: { select: { name: true, price: true, priceFrequency: true } },
        },
      });

      let sent = 0;

      const billGroups = groupByKey(
        upcomingBills,
        (bill) => bill.tenants?.user?.id ?? `bill:${bill.id}`
      );

      await runWithConcurrency(
        billGroups,
        NOTIFICATION_CONCURRENCY,
        async (bills) => {
          // Reminders for one recipient stay ordered so cooldown deduplication
          // checks observe notifications created earlier in this run.
          for (const bill of bills) {
            if (!bill.tenants?.user || !bill.landlordId) continue;

            let settingsPromise = settingsCache.get(bill.landlordId);
            if (!settingsPromise) {
              settingsPromise = LandlordSettingsService.getAllGlobalSettings(
                bill.landlordId
              );
              settingsCache.set(bill.landlordId, settingsPromise);
            }

            const settings = await settingsPromise;
            if (!settings?.notificationEnabled) continue;

            const frequency = bill.property?.priceFrequency ?? PriceFrequency.MONTHLY;
            const rentBase = Number(bill.property?.price ?? bill.amount);
            const rules = resolveFinancialRules(settings, rentBase, frequency);

            const { isRentBillRecord } = await import('../utils/globalSettings.util');
            const isRent = isRentBillRecord(bill);
            const leadDays = isRent
              ? rules.rentReminderIntervalDays
              : rules.billReminderIntervalDays;
            if (leadDays <= 0) continue;

            const daysUntilDue = Math.ceil(
              (new Date(bill.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilDue >= 0 && daysUntilDue <= leadDays) {
              await this.sendBillDueReminder(bill.id, settings ?? undefined);
              sent += 1;
            }
          }
        }
      );

      loggers.info(`Checked ${upcomingBills.length} upcoming bills, sent ${sent} reminders`);
    } catch (error) {
      loggers.error('Error checking due bills:', error);
    }
  }

  /**
   * Check for overdue bills and send notifications
   */
  async checkAndSendOverdueBillsNotifications(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const overdueBills = await prismaClient.billsSubCategory.findMany({
        where: {
          dueDate: {
            lt: today
          },
          isDeleted: false
        },
        include: {
          tenants: { include: { user: true } },
          landlord: { include: { user: true } },
          property: true
        }
      });

      const billGroups = groupByKey(
        overdueBills,
        (bill) => bill.tenants?.user?.id ?? `bill:${bill.id}`
      );
      await runWithConcurrency(
        billGroups,
        NOTIFICATION_CONCURRENCY,
        async (bills) => {
          for (const bill of bills) {
            await this.sendBillOverdueNotification(bill.id);
          }
        }
      );

      console.log(`🚨 Checked ${overdueBills.length} overdue bills`);
    } catch (error) {
      console.error('❌ Error checking overdue bills:', error);
    }
  }

  /**
   * Send wallet balance update notification
   */
  async sendWalletBalanceUpdate(
    userId: string,
    newBalance: number,
    transactionType: TransactionType,
    currency?: string | null
  ): Promise<void> {
    try {
      const balanceLabel = this.formatAmount(newBalance, currency);
      const notification: PaymentNotification = {
        type: 'payment_success',
        title: 'Wallet Updated',
        message: `Your wallet balance has been updated to ${balanceLabel}.`,
        data: {
          newBalance,
          transactionType,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('wallet_update', notification);
      console.log(`💰 Wallet balance update sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending wallet balance update:', error);
    }
  }

  /**
   * Notify tenant when landlord adjusts rent (even if no bill is created).
   */
  async sendRentAdjustmentNotification(
    tenantUserId: string,
    oldRent: number,
    newRent: number,
    currency?: string | null,
    landlordUserId?: string | null,
    landlordId?: string | null
  ): Promise<void> {
    try {
      const code = currency ? String(currency) : 'NGN';
      const format = (value: number) =>
        `${code} ${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

      const notification: PaymentNotification = {
        type: 'rent_adjusted',
        title: 'Rent updated',
        message: `Your rent has been updated from ${format(oldRent)} to ${format(newRent)}.`,
        data: {
          oldRent,
          newRent,
          currency: code,
          timestamp: new Date(),
          route: '/profile/TenancyInfo',
        },
        timestamp: new Date(),
      };

      this.io.to(`user:${tenantUserId}`).emit('payment_notification', notification);

      try {
        const NotificationService = (await import('./notification.service')).default;
        await NotificationService.createNotification(
          {
            sourceId: landlordUserId ?? undefined,
            destId: tenantUserId,
            title: notification.title,
            message: notification.message,
          },
          'ONLINE_PAYMENTS'
        );
      } catch (persistError) {
        loggers.error('Failed to persist rent adjustment notification:', persistError);
      }

      const settings = landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(landlordId)
        : null;
      const methods = this.resolveReminderMethods(settings);

      if (this.shouldUseMethod(methods, ReminderMethodType.PUSH)) {
        try {
          const expoPushService = (await import('./expoPush.service')).default;
          await expoPushService.sendToUser(tenantUserId, {
            title: notification.title,
            body: notification.message,
            data: {
              type: notification.type,
              route: '/profile/TenancyInfo',
            },
          });
        } catch (pushError) {
          loggers.error('Failed to send rent adjustment push:', pushError);
        }
      }
    } catch (error) {
      loggers.error('Error sending rent adjustment notification:', error);
    }
  }
}

export default PaymentNotificationService;
