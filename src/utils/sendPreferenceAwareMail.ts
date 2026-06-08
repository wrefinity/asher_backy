import { NotificationCategory } from '@prisma/client';
import sendMail from './emailer';
import loggers from './loggers';
import {
  mapNotificationTypeToCategory,
  shouldSendNotification,
} from './notificationPreferenceChecker';

type SendPreferenceAwareMailParams = {
  userId?: string | null;
  category?: NotificationCategory | null;
  notificationType?: string;
  to: string;
  subject: string;
  html: string;
};

/**
 * Sends email only when the recipient has EMAIL enabled for the category.
 * Skips preference check when userId is omitted (external recipients).
 */
export async function sendPreferenceAwareMail(
  params: SendPreferenceAwareMailParams
): Promise<boolean> {
  const { userId, category, notificationType, to, subject, html } = params;

  if (!to?.trim()) return false;

  if (userId) {
    const resolvedCategory =
      category ||
      mapNotificationTypeToCategory(notificationType || subject || '') ||
      NotificationCategory.COMMUNICATION;

    const allowed = await shouldSendNotification(
      userId,
      resolvedCategory,
      notificationType || subject,
      'EMAIL'
    );

    if (!allowed) {
      loggers.info(
        `Email blocked by notification preferences: user=${userId} category=${resolvedCategory}`
      );
      return false;
    }
  }

  await sendMail(to, subject, html);
  return true;
}
