import { Job } from 'bull';
import { notificationQueue, NotificationJobType, NotificationJobData } from './notificationQueue';
import { serverInstance } from '../index';
import logger from '../utils/loggers';
import { prismaClient } from '../index';

// Process notification queue jobs with consistent type handling
notificationQueue.process(async (job: Job<any>) => {
  const jobType = job.data.type || job.data.task || job.name;
  logger.info(`🔄 Processing job: ${jobType} (ID: ${job.id})`);

  try {
    // Normalize job type to enum value
    let normalizedType: NotificationJobType;

    if (jobType === 'CHECK_DUE_BILLS' || jobType === 'check-due-bills') {
      normalizedType = NotificationJobType.CHECK_DUE_BILLS;
    } else if (jobType === 'CHECK_OVERDUE_BILLS' || jobType === 'check-overdue-bills') {
      normalizedType = NotificationJobType.CHECK_OVERDUE_BILLS;
    } else if (jobType === 'CLEANUP_OLD_NOTIFICATIONS' || jobType === 'cleanup-notifications') {
      normalizedType = NotificationJobType.CLEANUP_OLD_NOTIFICATIONS;
    } else if (jobType === NotificationJobType.SEND_PAYMENT_NOTIFICATION) {
      normalizedType = NotificationJobType.SEND_PAYMENT_NOTIFICATION;
    } else {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    // Process based on normalized type
    switch (normalizedType) {
      case NotificationJobType.CHECK_DUE_BILLS:
        await handleDueBillsCheck(job);
        break;

      case NotificationJobType.CHECK_OVERDUE_BILLS:
        await handleOverdueBillsCheck(job);
        break;

      case NotificationJobType.CLEANUP_OLD_NOTIFICATIONS:
        await handleNotificationCleanup(job);
        break;

      case NotificationJobType.SEND_PAYMENT_NOTIFICATION:
        await handlePaymentNotification(job);
        break;
    }

    logger.info(`✅ Job ${job.id} (${normalizedType}) completed successfully`);
  } catch (error) {
    logger.error(`❌ Job ${job.id} (${jobType}) failed:`, error);
    throw error; // Bull will handle retries
  }
});

// Handler: Check due bills
async function handleDueBillsCheck(job: Job) {
  if (!serverInstance.paymentNotificationService) {
    throw new Error('PaymentNotificationService not initialized');
  }

  await serverInstance.paymentNotificationService.checkAndSendDueBillsReminders();
  logger.info('🔔 Checked and sent due bills reminders');
}

// Handler: Check overdue bills
async function handleOverdueBillsCheck(job: Job) {
  if (!serverInstance.paymentNotificationService) {
    throw new Error('PaymentNotificationService not initialized');
  }

  await serverInstance.paymentNotificationService.checkAndSendOverdueBillsNotifications();
  logger.info('🔔 Checked and sent overdue bills notifications');
}

// Handler: Cleanup old notifications
async function handleNotificationCleanup(job: Job<any>) {
  const olderThanDays = job.data.days || job.data.olderThanDays || 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  // Use Prisma to delete old read notifications
  const result = await prismaClient.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true, // Only delete read notifications
    },
  });

  logger.info(
    `🧹 Cleaned up ${result.count} notifications older than ${olderThanDays} days`
  );

  return { deletedCount: result.count, cutoffDate };
}

// Handler: Send payment notification
async function handlePaymentNotification(job: Job<NotificationJobData>) {
  if (job.data.type !== NotificationJobType.SEND_PAYMENT_NOTIFICATION) {
    return;
  }

  const { userId, billId, amount, billName, status, reason } = job.data;

  if (!serverInstance.paymentNotificationService) {
    throw new Error('PaymentNotificationService not initialized');
  }

  if (status === 'success') {
    await serverInstance.paymentNotificationService.sendPaymentSuccessNotification(
      userId,
      billId,
      amount,
      billName
    );
  } else {
    await serverInstance.paymentNotificationService.sendPaymentFailureNotification(
      userId,
      billId,
      amount,
      billName,
      reason || 'Payment failed'
    );
  }

  logger.info(`🔔 Sent payment ${status} notification to user ${userId}`);
}

logger.info('🔔 Notification processor initialized');

export default notificationQueue;
