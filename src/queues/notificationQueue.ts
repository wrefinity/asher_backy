import Queue from 'bull';
import logger from '../utils/loggers';
import { getRedisConfig } from '../utils/redisConfig';

// Track Redis connection state to reduce error spam
let redisConnected = false;
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 60000; // Log errors at most once per minute

// Get Redis configuration
const redisConfig = getRedisConfig();

// Create notification queue with proper retry configuration
// Note: Bull requires maxRetriesPerRequest and enableReadyCheck to be null for subscriber client
export const notificationQueue = new Queue('notifications', {
  redis: {
    ...redisConfig,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 1000, 10000); // Max 10 seconds
      // Only log retries occasionally to reduce noise
      if (times % 10 === 0) {
        logger.info(`Redis retry attempt ${times}, waiting ${delay}ms`);
      }
      return delay;
    },
    reconnectOnError: (err) => {
      const now = Date.now();
      // Only log connection errors periodically to reduce spam
      if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
        logger.warn('⚠️ Redis connection error (will retry silently):', err.message || err);
        logger.warn('💡 Tip: Check REDIS_URL or REDIS_HOST/REDIS_PORT env vars. App will use fallback scheduling.');
        lastErrorLogTime = now;
      }
      return true; // Always try to reconnect
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Job types
export enum NotificationJobType {
  CHECK_DUE_BILLS = 'check_due_bills',
  CHECK_OVERDUE_BILLS = 'check_overdue_bills',
  CLEANUP_OLD_NOTIFICATIONS = 'cleanup_old_notifications',
  SEND_PAYMENT_NOTIFICATION = 'send_payment_notification',
}

// Job data interfaces
export interface DueBillsJobData {
  type: NotificationJobType.CHECK_DUE_BILLS;
}

export interface OverdueBillsJobData {
  type: NotificationJobType.CHECK_OVERDUE_BILLS;
}

export interface CleanupNotificationsJobData {
  type: NotificationJobType.CLEANUP_OLD_NOTIFICATIONS;
  olderThanDays: number;
}

export interface PaymentNotificationJobData {
  type: NotificationJobType.SEND_PAYMENT_NOTIFICATION;
  userId: string;
  billId: string;
  amount: number;
  billName: string;
  status: 'success' | 'failed';
  reason?: string;
}

export type NotificationJobData =
  | DueBillsJobData
  | OverdueBillsJobData
  | CleanupNotificationsJobData
  | PaymentNotificationJobData;

// Helper functions to add jobs
export const scheduleDueBillsCheck = async () => {
  try {
    // Check if queue is ready before adding jobs
    if (!redisConnected && !isQueueReady()) {
      logger.warn('⚠️ Redis not connected, skipping job scheduling. Will use fallback.');
      return;
    }

    // Ensure job data is serializable (plain object, no functions, no circular refs)
    const jobData = {
      type: 'CHECK_DUE_BILLS',
      timestamp: Date.now(),
    };

    await notificationQueue.add(
      'check-due-bills',
      jobData,
      {
        repeat: {
          cron: '0 9 * * *', // Once daily at 9 AM (dedup limits tenant messages to once per month)
        },
        jobId: 'check-due-bills-daily',
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    logger.info('🔔 Scheduled job: Check due bills (daily at 9 AM)');
  } catch (error: any) {
    // Handle specific Bull/Redis errors gracefully
    if (error.message?.includes('buffer') || error.code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
      logger.warn('⚠️ Bull queue serialization error - Redis may be disconnected or job data invalid. Using fallback.');
      return; // Don't throw, let fallback handle it
    }
    logger.error('Failed to schedule due bills check:', error);
    throw error;
  }
};

export const scheduleOverdueBillsCheck = async () => {
  try {
    // Check if queue is ready before adding jobs
    if (!redisConnected && !isQueueReady()) {
      logger.warn('⚠️ Redis not connected, skipping job scheduling. Will use fallback.');
      return;
    }

    // Ensure job data is serializable
    const jobData = {
      type: 'CHECK_OVERDUE_BILLS',
      timestamp: Date.now(),
    };

    await notificationQueue.add(
      'check-overdue-bills',
      jobData,
      {
        repeat: {
          cron: '0 10 * * *', // Once daily at 10 AM
        },
        jobId: 'check-overdue-bills-daily',
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    logger.info('🔔 Scheduled job: Check overdue bills (daily at 10 AM)');
  } catch (error: any) {
    // Handle specific Bull/Redis errors gracefully
    if (error.message?.includes('buffer') || error.code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
      logger.warn('⚠️ Bull queue serialization error - Redis may be disconnected or job data invalid. Using fallback.');
      return; // Don't throw, let fallback handle it
    }
    logger.error('Failed to schedule overdue bills check:', error);
    throw error;
  }
};

export const scheduleNotificationCleanup = async () => {
  try {
    // Check if queue is ready before adding jobs
    if (!redisConnected && !isQueueReady()) {
      logger.warn('⚠️ Redis not connected, skipping job scheduling. Will use fallback.');
      return;
    }

    // Ensure job data is serializable
    const jobData = {
      type: 'CLEANUP_OLD_NOTIFICATIONS',
      days: 90,
      timestamp: Date.now(),
    };

    await notificationQueue.add(
      'cleanup-notifications',
      jobData,
      {
        repeat: {
          cron: '0 2 * * *', // Every day at 2 AM
        },
        jobId: 'cleanup-notifications-daily',
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    logger.info('🔔 Scheduled job: Cleanup old notifications (daily at 2 AM)');
  } catch (error: any) {
    // Handle specific Bull/Redis errors gracefully
    if (error.message?.includes('buffer') || error.code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
      logger.warn('⚠️ Bull queue serialization error - Redis may be disconnected or job data invalid. Using fallback.');
      return; // Don't throw, let fallback handle it
    }
    logger.error('Failed to schedule notification cleanup:', error);
    throw error;
  }
};

// Queue event listeners
notificationQueue.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} completed successfully`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} failed:`, err);
});

notificationQueue.on('error', (error: any) => {
  const now = Date.now();
  // Suppress repeated connection errors, log periodically
  if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      logger.warn('⚠️ Redis not available - queue operations will fail. Using fallback scheduling.');
      redisConnected = false;
    } else if (error.code === 'ERR_BUFFER_OUT_OF_BOUNDS' || error.message?.includes('buffer')) {
      logger.warn('⚠️ Bull queue serialization error - Redis may be disconnected. Using fallback scheduling.');
      redisConnected = false;
    } else {
      logger.error('🚨 Queue error:', error);
    }
    lastErrorLogTime = now;
  }
});

// Track connection state
notificationQueue.on('ready', () => {
  if (!redisConnected) {
    redisConnected = true;
    logger.info('✅ Redis connected - Bull queue is ready');
  }
});

notificationQueue.on('close', () => {
  redisConnected = false;
  logger.warn('⚠️ Redis connection closed');
});

// Helper function to safely check if queue is ready
export const isQueueReady = (): boolean => {
  try {
    const client = notificationQueue.client;
    if (client && (client.status === 'ready' || client.status === 'connect')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Check connection status periodically
const checkConnection = async () => {
  try {
    redisConnected = isQueueReady();
  } catch (error) {
    redisConnected = false;
  }
};

// Check connection every 30 seconds
setInterval(checkConnection, 30000);

// Initial connection check after a short delay (to allow queue to initialize)
setTimeout(checkConnection, 2000);

logger.info('🔔 Notification queue initialized (Redis connection will be attempted)');
