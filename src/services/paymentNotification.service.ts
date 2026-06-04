import { Server as IOServer } from "socket.io";
import { prismaClient } from "..";
import { PriceFrequency, TransactionType } from "@prisma/client";
import loggers from "../utils/loggers";
import LandlordSettingsService from "../landlord/services/propertySetting.service";
import { resolveFinancialRules } from "../utils/globalSettings.util";

export interface PaymentNotification {
  type: 'payment_success' | 'payment_failed' | 'bill_due' | 'bill_overdue' | 'payment_reminder';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
}

export class PaymentNotificationService {
  private io: IOServer;

  constructor(io: IOServer) {
    this.io = io;
  }

  /**
   * Send payment success notification to tenant
   */
  async sendPaymentSuccessNotification(
    userId: string, 
    billId: string, 
    amount: number, 
    billName: string
  ): Promise<void> {
    try {
      const notification: PaymentNotification = {
        type: 'payment_success',
        title: 'Payment Successful',
        message: `Your payment of ${amount} NGN for ${billName} has been processed successfully.`,
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
      
      // Also send to landlord if they're online
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: { landlord: { include: { user: true } } }
      });

      if (bill?.landlord?.user) {
        const landlordNotification: PaymentNotification = {
          type: 'payment_success',
          title: 'Payment Received',
          message: `Payment of ${amount} NGN received for ${billName} from tenant.`,
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
    reason: string
  ): Promise<void> {
    try {
      const notification: PaymentNotification = {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment of ${amount} NGN for ${billName} failed. Reason: ${reason}`,
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
  async sendBillDueReminder(billId: string): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: { 
          tenants: { include: { user: true } },
          property: true 
        }
      });

      if (!bill || !bill.tenants?.user) {
        console.log('❌ Bill or tenant not found for reminder');
        return;
      }

      const daysUntilDue = Math.ceil((new Date(bill.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      const notification: PaymentNotification = {
        type: 'bill_due',
        title: 'Bill Due Soon',
        message: `Your ${bill.billName} bill of ${bill.amount} NGN is due in ${daysUntilDue} days.`,
        data: {
          billId,
          billName: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          daysUntilDue,
          propertyName: bill.property?.name,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      this.io.to(`user:${bill.tenants.user.id}`).emit('payment_notification', notification);
      console.log(`📅 Bill due reminder sent to user ${bill.tenants.user.id}`);
    } catch (error) {
      console.error('❌ Error sending bill due reminder:', error);
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
          tenants: { include: { user: true } },
          landlord: { include: { user: true } },
          property: true 
        }
      });

      if (!bill || !bill.tenants?.user) {
        console.log('❌ Bill or tenant not found for overdue notification');
        return;
      }

      const daysOverdue = Math.ceil((new Date().getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24));

      // Notify tenant
      const tenantNotification: PaymentNotification = {
        type: 'bill_overdue',
        title: 'Bill Overdue',
        message: `Your ${bill.billName} bill of ${bill.amount} NGN is overdue by ${daysOverdue} days.`,
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

      this.io.to(`user:${bill.tenants.user.id}`).emit('payment_notification', tenantNotification);

      // Notify landlord
      if (bill.landlord?.user) {
        const landlordNotification: PaymentNotification = {
          type: 'bill_overdue',
          title: 'Tenant Bill Overdue',
          message: `Tenant's ${bill.billName} bill of ${bill.amount} NGN is overdue by ${daysOverdue} days.`,
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

      console.log(`🚨 Bill overdue notification sent to tenant ${bill.tenants.user.id} and landlord`);
    } catch (error) {
      console.error('❌ Error sending bill overdue notification:', error);
    }
  }

  /**
   * Send payment reminder notification
   */
  async sendPaymentReminderNotification(billId: string, reminderMessage?: string): Promise<void> {
    try {
      const bill = await prismaClient.billsSubCategory.findUnique({
        where: { id: billId },
        include: { 
          tenants: { include: { user: true } },
          property: true 
        }
      });

      if (!bill || !bill.tenants?.user) {
        console.log('❌ Bill or tenant not found for payment reminder');
        return;
      }

      const notification: PaymentNotification = {
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: reminderMessage || `Please pay your ${bill.billName} bill of ${bill.amount} NGN.`,
        data: {
          billId,
          billName: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          propertyName: bill.property?.name,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      this.io.to(`user:${bill.tenants.user.id}`).emit('payment_notification', notification);
      console.log(`🔔 Payment reminder sent to user ${bill.tenants.user.id}`);
    } catch (error) {
      console.error('❌ Error sending payment reminder notification:', error);
    }
  }

  /**
   * Check for bills due today and send reminders
   */
  async checkAndSendDueBillsReminders(): Promise<void> {
    try {
      const now = new Date();
      const settingsCache = new Map<string, Awaited<ReturnType<typeof LandlordSettingsService.getAllGlobalSettings>>>();

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

      for (const bill of upcomingBills) {
        if (!bill.tenants?.user || !bill.landlordId) continue;

        if (!settingsCache.has(bill.landlordId)) {
          settingsCache.set(
            bill.landlordId,
            await LandlordSettingsService.getAllGlobalSettings(bill.landlordId)
          );
        }

        const settings = settingsCache.get(bill.landlordId);
        if (!settings?.notificationEnabled) continue;

        const frequency = bill.property?.priceFrequency ?? PriceFrequency.MONTHLY;
        const rentBase = Number(bill.property?.price ?? bill.amount);
        const rules = resolveFinancialRules(settings, rentBase, frequency);

        if (rules.reminderIntervalDays <= 0) continue;

        const daysUntilDue = Math.ceil(
          (new Date(bill.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDue >= 0 && daysUntilDue <= rules.reminderIntervalDays) {
          await this.sendBillDueReminder(bill.id);
          sent += 1;
        }
      }

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

      for (const bill of overdueBills) {
        await this.sendBillOverdueNotification(bill.id);
      }

      console.log(`🚨 Checked ${overdueBills.length} overdue bills`);
    } catch (error) {
      console.error('❌ Error checking overdue bills:', error);
    }
  }

  /**
   * Send wallet balance update notification
   */
  async sendWalletBalanceUpdate(userId: string, newBalance: number, transactionType: TransactionType): Promise<void> {
    try {
      const notification: PaymentNotification = {
        type: 'payment_success',
        title: 'Wallet Updated',
        message: `Your wallet balance has been updated to ${newBalance} NGN.`,
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
}

export default PaymentNotificationService;
