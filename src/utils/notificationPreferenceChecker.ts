import { prismaClient } from '..';
import { NotificationCategory, NotificationChannel } from '@prisma/client';

/**
 * Maps notification types to notification categories
 */
export const mapNotificationTypeToCategory = (type: string): NotificationCategory | null => {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('payment') || typeLower.includes('bill')) {
    return 'ONLINE_PAYMENTS';
  }
  if (typeLower.includes('maintenance') || typeLower.includes('request')) {
    return 'MAINTENANCE_REQUESTS';
  }
  if (typeLower.includes('message') || typeLower.includes('chat')) {
    return 'COMMUNICATION';
  }
  if (typeLower.includes('login') || typeLower.includes('security')) {
    return 'SECURITY';
  }
  if (typeLower.includes('moveout') || typeLower.includes('move_out')) {
    return 'MOVE_OUT';
  }
  if (typeLower.includes('property') && typeLower.includes('match')) {
    return 'PROPERTY_MATCH';
  }
  if (typeLower.includes('inquiry') || typeLower.includes('inquiry')) {
    return 'WEBSITE_INQUIRY';
  }
  if (typeLower.includes('support') || typeLower.includes('ticket')) {
    return 'SUPPORT_TICKET';
  }
  if (typeLower.includes('marketing') || typeLower.includes('promo')) {
    return 'MARKETING_EMAILS';
  }
  
  return null;
};

/**
 * Maps specific notification events to preference fields
 */
export const mapNotificationToPreferenceField = (
  category: NotificationCategory,
  notificationType: string
): string | null => {
  const typeLower = notificationType.toLowerCase();
  
  switch (category) {
    case 'SECURITY':
      if (typeLower.includes('login')) return 'notifyOnLoginActivity';
      break;
    case 'COMMUNICATION':
      if (typeLower.includes('message')) return 'notifyOnNewMessages';
      break;
    case 'ONLINE_PAYMENTS':
      if (typeLower.includes('payment_success') || typeLower.includes('success')) {
        return 'notifyPaymentSuccess';
      }
      if (typeLower.includes('payment_failed') || typeLower.includes('failed')) {
        return 'notifyPaymentFailed';
      }
      if (typeLower.includes('payment_initiated') || typeLower.includes('initiated')) {
        return 'notifyPaymentInitiated';
      }
      break;
    case 'MAINTENANCE_REQUESTS':
      if (typeLower.includes('new') || typeLower.includes('created')) {
        return 'notifyNewMaintenanceRequest';
      }
      if (typeLower.includes('status') || typeLower.includes('change')) {
        return 'notifyRequestStatusChange';
      }
      if (typeLower.includes('message') || typeLower.includes('note')) {
        return 'notifyRequestMessage';
      }
      if (typeLower.includes('resolved') || typeLower.includes('complete')) {
        return 'notifyRequestResolved';
      }
      if (typeLower.includes('invoice')) {
        return 'notifyNewInvoice';
      }
      break;
    case 'MOVE_OUT':
      return 'notifyTenantMoveOut';
    case 'PROPERTY_MATCH':
      return 'notifyPropertyMatch';
    case 'WEBSITE_INQUIRY':
      return 'notifyNewInquiry';
    case 'SUPPORT_TICKET':
      return 'notifyNewSupportTicket';
    case 'MARKETING_EMAILS':
      return 'receiveMarketingEmails';
  }
  
  return null;
};

/**
 * Check if user should receive a notification based on their preferences
 * @param userId - User ID
 * @param category - Notification category
 * @param notificationType - Type of notification (e.g., 'payment_success', 'bill_due')
 * @param channel - Channel to check (EMAIL, PUSH, IN_APP, SMS)
 * @returns true if notification should be sent, false otherwise
 */
export async function shouldSendNotification(
  userId: string,
  category: NotificationCategory,
  notificationType: string,
  channel: NotificationChannel = 'IN_APP'
): Promise<boolean> {
  try {
    // Get user's notification preferences for this category
    const preference = await prismaClient.notificationPreference.findUnique({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
    });

    // If no preference exists, default to allowing notifications (backward compatibility)
    if (!preference) {
      return true;
    }

    // Check if the channel is enabled
    if (!preference.channels.includes(channel)) {
      return false;
    }

    // Check category-specific preference field
    const preferenceField = mapNotificationToPreferenceField(category, notificationType);
    if (preferenceField) {
      const fieldValue = preference[preferenceField as keyof typeof preference];
      if (typeof fieldValue === 'boolean' && !fieldValue) {
        return false;
      }
    }

    // If we get here, the notification should be sent
    return true;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // On error, default to allowing notification (fail open)
    return true;
  }
}

/**
 * Check if user should receive notification via specific channel
 * @param userId - User ID
 * @param category - Notification category
 * @param channel - Channel to check
 * @returns true if channel is enabled, false otherwise
 */
export async function isChannelEnabled(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel
): Promise<boolean> {
  try {
    const preference = await prismaClient.notificationPreference.findUnique({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
    });

    if (!preference) {
      return true; // Default to enabled if no preference
    }

    return preference.channels.includes(channel);
  } catch (error) {
    console.error('Error checking channel preference:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Get all enabled channels for a user's notification category
 * @param userId - User ID
 * @param category - Notification category
 * @returns Array of enabled channels
 */
export async function getEnabledChannels(
  userId: string,
  category: NotificationCategory
): Promise<NotificationChannel[]> {
  try {
    const preference = await prismaClient.notificationPreference.findUnique({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
    });

    if (!preference) {
      // Default channels if no preference exists
      return ['IN_APP', 'PUSH'];
    }

    return preference.channels;
  } catch (error) {
    console.error('Error getting enabled channels:', error);
    return ['IN_APP', 'PUSH']; // Default channels on error
  }
}

