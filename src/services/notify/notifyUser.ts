import { NotificationCategory } from '@prisma/client';
import { prismaClient } from '../../db/prismaClient';
import loggers from '../../utils/loggers';
import { sendPreferenceAwareMail } from '../../utils/sendPreferenceAwareMail';
import NotificationService from '../notification.service';
import {
  getNotifyEventConfig,
  NotifyChannel,
  NotifyEventType,
  NotifyTone,
} from './notifyEvents';

export type NotifyUserParams = {
  /** Destination Asher user id (always required). */
  userId: string;
  /** Registry key — drives default category, channels, route, title. */
  type: NotifyEventType | string;
  title?: string;
  message: string;
  category?: NotificationCategory;
  route?: string;
  /** Override registry defaults. Example: ['IN_APP','EMAIL']. */
  channels?: NotifyChannel[];
  sourceId?: string;
  tone?: NotifyTone;
  /** Default true when IN_APP is selected. */
  emitRealtime?: boolean;
  /** Optional email body; defaults to a simple HTML wrapper of message. */
  emailHtml?: string;
  emailSubject?: string;
};

export type NotifyUserResult = {
  inAppId: string | null;
  pushed: boolean;
  emailed: boolean;
  channelsAttempted: NotifyChannel[];
  blockedByPrefs: boolean;
};

function buildDefaultEmailHtml(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  return `<p><strong>${safeTitle}</strong></p><p>${safeMessage}</p><p style="color:#666;font-size:12px;">This is an Asher notification.</p>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Single entry for product notifications.
 *
 * Channels default from the event registry; callers can override.
 * Each channel is still gated by the recipient's NotificationPreference.
 *
 * @example
 * await notifyUser({
 *   userId: landlord.userId,
 *   type: 'website_inquiry',
 *   message: enquiryText,
 *   route: '/leasing',
 * });
 */
export async function notifyUser(
  params: NotifyUserParams
): Promise<NotifyUserResult> {
  if (!params.userId?.trim()) {
    loggers.warn('[notifyUser] skipped — missing userId');
    return {
      inAppId: null,
      pushed: false,
      emailed: false,
      channelsAttempted: [],
      blockedByPrefs: false,
    };
  }

  const config = getNotifyEventConfig(params.type);
  const channels = (params.channels?.length
    ? params.channels
    : config.channels) as NotifyChannel[];
  const uniqueChannels = [...new Set(channels)];
  const category = params.category || config.category;
  const title = (params.title || config.title || 'Notification').trim();
  const route = params.route ?? config.route;
  const tone = params.tone || config.tone || 'info';
  const typeKey = String(params.type);

  const wantsInApp = uniqueChannels.includes('IN_APP');
  const wantsPush = uniqueChannels.includes('PUSH');
  const wantsEmail = uniqueChannels.includes('EMAIL');

  const result: NotifyUserResult = {
    inAppId: null,
    pushed: false,
    emailed: false,
    channelsAttempted: uniqueChannels,
    blockedByPrefs: false,
  };

  let inAppOrPushAttempted = false;
  let inAppOrPushDelivered = false;

  try {
    if (wantsInApp || wantsPush) {
      inAppOrPushAttempted = true;
      const deliveryChannels: Array<'IN_APP' | 'PUSH'> = [];
      if (wantsInApp) deliveryChannels.push('IN_APP');
      if (wantsPush) deliveryChannels.push('PUSH');

      const notification = await NotificationService.createNotification(
        {
          destId: params.userId,
          sourceId: params.sourceId,
          title,
          message: params.message,
          notificationType: typeKey,
          category,
          route: route || null,
          type: tone,
          emitRealtime: params.emitRealtime !== false && wantsInApp,
          channels: deliveryChannels,
          skipPush: !wantsPush,
        },
        category
      );

      // Real inbox row has a string id; push-only marker returns id: null but non-null object.
      const inboxId =
        notification && typeof (notification as { id?: unknown }).id === 'string'
          ? String((notification as { id: string }).id)
          : null;
      result.inAppId = inboxId;
      inAppOrPushDelivered = notification != null;
      result.pushed = wantsPush && inAppOrPushDelivered;
    }

    if (wantsEmail) {
      const user = await prismaClient.users.findUnique({
        where: { id: params.userId },
        select: { email: true },
      });
      if (user?.email) {
        result.emailed = await sendPreferenceAwareMail({
          userId: params.userId,
          category,
          notificationType: typeKey,
          to: user.email,
          subject: params.emailSubject || title,
          html:
            params.emailHtml ||
            buildDefaultEmailHtml(title, params.message),
        });
      } else {
        loggers.warn(
          `[notifyUser] EMAIL skipped — no email for user=${params.userId} type=${typeKey}`
        );
      }
    }

    const anyDelivered =
      Boolean(result.inAppId) || result.pushed || result.emailed;
    const anyAttempted =
      inAppOrPushAttempted || wantsEmail;
    result.blockedByPrefs = anyAttempted && !anyDelivered;

    if (result.blockedByPrefs) {
      loggers.info(
        `[notifyUser] all channels blocked type=${typeKey} user=${params.userId} channels=${uniqueChannels.join(',')}`
      );
    }
  } catch (error) {
    loggers.error(
      `[notifyUser] failed type=${typeKey} user=${params.userId}`,
      error
    );
  }

  return result;
}

export default notifyUser;
