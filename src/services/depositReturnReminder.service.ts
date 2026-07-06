import { MoveOutNoticeStatus, NotificationCategory } from '@prisma/client';
import { prismaClient } from '..';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import NotificationService from './notification.service';
import { resolveFinancialRules } from '../utils/globalSettings.util';
import { computeDepositReturnDeadline, startOfCalendarDay } from '../utils/settingsEnforcement.util';
import loggers from '../utils/loggers';

type ReminderKind = '7d' | '1d' | 'due';

type DepositReminderMeta = {
  depositReturnDeadline?: string;
  depositReturnDays?: number;
  depositRemindersSent?: string[];
};

function readReminderMeta(searchCriteria: unknown): DepositReminderMeta {
  if (!searchCriteria || typeof searchCriteria !== 'object') return {};
  return searchCriteria as DepositReminderMeta;
}

function daysUntil(date: Date, from: Date): number {
  return Math.round(
    (startOfCalendarDay(date).getTime() - startOfCalendarDay(from).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

class DepositReturnReminderService {
  async checkDepositReturnDeadlines(): Promise<number> {
    const today = startOfCalendarDay(new Date());
    const notices = await prismaClient.moveOutNotice.findMany({
      where: { status: MoveOutNoticeStatus.ACKNOWLEDGED },
      include: {
        tenant: {
          include: {
            landlord: { select: { id: true, userId: true } },
            user: { select: { id: true, email: true } },
            property: { select: { id: true, name: true } },
          },
        },
      },
      take: 300,
    });

    let sent = 0;

    for (const notice of notices) {
      const landlordId = notice.tenant.landlord?.id;
      const landlordUserId = notice.tenant.landlord?.userId;
      const tenantUserId = notice.tenant.user?.id;
      if (!landlordId || !landlordUserId || !tenantUserId) continue;

      const meta = readReminderMeta(notice.searchCriteria);
      let deadline =
        meta.depositReturnDeadline != null
          ? new Date(meta.depositReturnDeadline)
          : null;

      if (!deadline || Number.isNaN(deadline.getTime())) {
        const settings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
        const rules = resolveFinancialRules(settings, 0, null);
        if (!rules.depositReturnTimeframeDays || rules.depositReturnTimeframeDays <= 0) {
          continue;
        }
        deadline = computeDepositReturnDeadline(
          notice.intendedMoveOutDate,
          rules.depositReturnTimeframeDays
        );
      }

      const remaining = daysUntil(deadline, today);
      let kind: ReminderKind | null = null;
      if (remaining === 7) kind = '7d';
      else if (remaining === 1) kind = '1d';
      else if (remaining === 0) kind = 'due';
      if (!kind) continue;

      const alreadySent = meta.depositRemindersSent ?? [];
      if (alreadySent.includes(kind)) continue;

      const propertyName = notice.tenant.property?.name ?? 'the property';
      const deadlineLabel = deadline.toLocaleDateString('en-GB');
      const tenantTitle =
        kind === 'due'
          ? 'Deposit return due today'
          : kind === '1d'
            ? 'Deposit return due tomorrow'
            : 'Deposit return deadline approaching';
      const tenantMessage =
        kind === 'due'
          ? `Your security deposit for ${propertyName} should be returned by today (${deadlineLabel}) per your landlord's settings.`
          : `Your security deposit for ${propertyName} should be returned by ${deadlineLabel} (${remaining} day${remaining === 1 ? '' : 's'} remaining).`;
      const landlordMessage =
        kind === 'due'
          ? `Deposit return deadline is today for ${propertyName}. Please process the tenant's security deposit return.`
          : `Deposit return deadline for ${propertyName} is ${deadlineLabel} (${remaining} day${remaining === 1 ? '' : 's'} remaining).`;

      try {
        await NotificationService.createNotification(
          {
            sourceId: landlordUserId,
            destId: tenantUserId,
            title: tenantTitle,
            message: tenantMessage,
            notificationType: 'deposit_return_reminder',
            route: '/profile/TenancyInfo',
          },
          NotificationCategory.MOVE_OUT
        );

        await NotificationService.createNotification(
          {
            sourceId: tenantUserId,
            destId: landlordUserId,
            title: tenantTitle,
            message: landlordMessage,
            notificationType: 'deposit_return_reminder',
            route: '/tenants/move-out-notices',
          },
          NotificationCategory.MOVE_OUT
        );

        const nextMeta: DepositReminderMeta = {
          ...meta,
          depositReturnDeadline: deadline.toISOString(),
          depositRemindersSent: [...alreadySent, kind],
        };

        await prismaClient.moveOutNotice.update({
          where: { id: notice.id },
          data: { searchCriteria: nextMeta },
        });

        sent += 1;
      } catch (error) {
        loggers.error('Failed to send deposit return reminder:', error);
      }
    }

    if (sent > 0) {
      loggers.info(`Sent ${sent} deposit return reminder(s)`);
    }

    return sent;
  }
}

export default new DepositReturnReminderService();
