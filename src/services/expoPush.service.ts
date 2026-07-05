import { NotificationCategory } from '@prisma/client';
import { prismaClient } from '..';
import loggers from '../utils/loggers';
import { shouldSendNotification } from '../utils/notificationPreferenceChecker';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
};

class ExpoPushService {
  async registerToken(userId: string, token: string, platform?: string) {
    return prismaClient.pushDeviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }

  async removeToken(token: string) {
    await prismaClient.pushDeviceToken.deleteMany({ where: { token } });
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> }
  ) {
    const shouldPush = await shouldSendNotification(
      userId,
      'ONLINE_PAYMENTS',
      payload.data?.type ? String(payload.data.type) : 'bill_created',
      'PUSH'
    );

    if (!shouldPush) {
      return { sent: 0, skipped: true };
    }

    const tokens = await prismaClient.pushDeviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return { sent: 0, skipped: false };
    }

    const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      channelId: 'bills',
    }));

    return this.sendBatch(messages);
  }

  async sendChatToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> }
  ) {
    return this.sendCategoryPush(
      userId,
      'COMMUNICATION',
      payload,
      payload.data?.type ? String(payload.data.type) : 'chat_message'
    );
  }

  async sendCategoryPush(
    userId: string,
    category: NotificationCategory,
    payload: { title: string; body: string; data?: Record<string, unknown> },
    notificationType?: string
  ) {
    const typeKey =
      notificationType ||
      (payload.data?.type ? String(payload.data.type) : payload.title);

    const shouldPush = await shouldSendNotification(
      userId,
      category,
      typeKey,
      'PUSH'
    );

    if (!shouldPush) {
      return { sent: 0, skipped: true };
    }

    const tokens = await prismaClient.pushDeviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return { sent: 0, skipped: false };
    }

    const channelId = this.channelForCategory(category, typeKey);
    const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      channelId,
    }));

    return this.sendBatch(messages);
  }

  private channelForCategory(
    category: NotificationCategory,
    notificationType?: string
  ): string {
    if (category === 'ONLINE_PAYMENTS') {
      return 'bills';
    }
    if (category === 'MAINTENANCE_REQUESTS') {
      return 'maintenance';
    }
    if (category === 'COMMUNICATION') {
      const type = (notificationType || '').toLowerCase();
      if (type.includes('chat') || type.includes('message')) {
        return 'messages';
      }
    }
    return 'general';
  }

  private async sendBatch(messages: ExpoPushMessage[]) {
    if (messages.length === 0) return { sent: 0 };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text();
        loggers.error('Expo push API error:', text);
        return { sent: 0, error: text };
      }

      const result = await response.json();
      const tickets = Array.isArray(result?.data) ? result.data : [result?.data];
      const invalidTokens = tickets
        .map((ticket: any, index: number) =>
          ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered'
            ? messages[index]?.to
            : null
        )
        .filter(Boolean) as string[];

      if (invalidTokens.length > 0) {
        await prismaClient.pushDeviceToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
      }

      return { sent: messages.length - invalidTokens.length };
    } catch (error) {
      loggers.error('Failed to send Expo push notifications:', error);
      return { sent: 0, error: String(error) };
    }
  }
}

export default new ExpoPushService();
