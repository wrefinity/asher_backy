import {
  MoveOutNoticeStatus,
  MoveOutNoticeType,
  Prisma,
  LogType,
} from '@prisma/client';
import { prismaClient } from '../db/prismaClient';
import LogsServices from './logs.services';
import InspectionMoveOutService from './inspectionMoveOut.service';
import { appendActivityLogRef } from '../utils/activityLogRef.util';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import { resolveFinancialRules } from '../utils/globalSettings.util';
import { computeDepositReturnDeadline } from '../utils/settingsEnforcement.util';

export interface CreateMoveOutNoticeInput {
  tenantId: string;
  intendedMoveOutDate: Date;
  reason: string;
  comments?: string;
  type: MoveOutNoticeType;
  searchCriteria?: Prisma.InputJsonValue;
}

class MoveOutNoticeService {
  private async resolveDepositReturnDeadline(
    landlordId: string,
    moveOutDate: Date
  ): Promise<{ deadline: Date; days: number } | null> {
    const settings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
    const rules = resolveFinancialRules(settings, 0, null);
    if (!rules.depositReturnTimeframeDays || rules.depositReturnTimeframeDays <= 0) {
      return null;
    }
    return {
      days: rules.depositReturnTimeframeDays,
      deadline: computeDepositReturnDeadline(moveOutDate, rules.depositReturnTimeframeDays),
    };
  }

  private enrichNoticeWithDepositReturn<T extends { intendedMoveOutDate: Date }>(
    notice: T,
    depositReturn: { deadline: Date; days: number } | null
  ) {
    if (!depositReturn) return notice;
    return {
      ...notice,
      depositReturnDeadline: depositReturn.deadline.toISOString(),
      depositReturnDays: depositReturn.days,
    };
  }

  async getCurrentTenantForUser(userId: string) {
    return prismaClient.tenants.findFirst({
      where: { userId, isCurrentLease: true, isDeleted: false },
      include: {
        landlord: { select: { id: true, userId: true } },
        property: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getActiveNoticeForTenant(tenantId: string) {
    return prismaClient.moveOutNotice.findFirst({
      where: {
        tenantId,
        status: {
          in: [MoveOutNoticeStatus.PENDING, MoveOutNoticeStatus.ACKNOWLEDGED],
        },
      },
      include: {
        relocationInterest: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNotice(input: CreateMoveOutNoticeInput) {
    const existing = await this.getActiveNoticeForTenant(input.tenantId);
    if (existing) {
      throw new Error('ACTIVE_MOVE_OUT_NOTICE_EXISTS');
    }

    const tenant = await prismaClient.tenants.findUnique({
      where: { id: input.tenantId },
      include: {
        landlord: { select: { id: true, userId: true } },
        property: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('TENANT_NOT_FOUND');
    }

    const notice = await prismaClient.moveOutNotice.create({
      data: {
        tenantId: input.tenantId,
        intendedMoveOutDate: input.intendedMoveOutDate,
        reason: input.reason,
        comments: input.comments ?? null,
        type: input.type,
        searchCriteria: input.searchCriteria ?? undefined,
      },
      include: { relocationInterest: true },
    });

    const tenantName =
      tenant.user?.profile?.fullname ||
      [tenant.user?.profile?.firstName, tenant.user?.profile?.lastName].filter(Boolean).join(' ') ||
      'A tenant';
    const moveOutDateStr = input.intendedMoveOutDate.toLocaleDateString();
    const typeLabel = input.type === MoveOutNoticeType.RELOCATING ? 'relocating' : 'moving out';

    let inspection = null;
    try {
      inspection = await InspectionMoveOutService.createMoveOutInspection({
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        landlordId: tenant.landlordId,
        noticeId: notice.id,
        intendedMoveOutDate: input.intendedMoveOutDate,
        reason: input.reason,
        comments: input.comments,
      });
    } catch (inspectionErr) {
      console.warn('Failed to auto-create move-out inspection draft', inspectionErr);
    }

    const scheduleRoute = inspection
      ? `/service/inspections/${inspection.id}?scheduleDraft=1`
      : '/service/inspections';

    const { notifyUser } = await import('./notify');
    await Promise.all([
      notifyUser({
        userId: tenant.landlord.userId,
        sourceId: tenant.userId,
        type: 'move_out_notice',
        title: 'Tenant leaving — schedule walkthrough',
        message: `${tenantName} submitted a move-out notice (${typeLabel}) for ${moveOutDateStr}. Reason: ${input.reason}. Open Inspections to set the appointment.`,
        route: scheduleRoute,
      }),
      LogsServices.createLog({
        events: appendActivityLogRef(
          `${tenantName} submitted move-out notice (${typeLabel}) for ${moveOutDateStr}`,
          { type: 'notice', id: notice.id }
        ),
        type: LogType.ACTIVITY,
        propertyId: tenant.propertyId,
        createdById: tenant.userId,
        subjects: 'Move-out notice submitted',
      }),
    ]);

    return { notice, inspection };
  }

  async listForLandlord(landlordId: string, status?: MoveOutNoticeStatus) {
    const notices = await prismaClient.moveOutNotice.findMany({
      where: {
        tenant: { landlordId, isDeleted: false },
        ...(status ? { status } : {}),
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullname: true, firstName: true, lastName: true, profileUrl: true } },
              },
            },
            property: { select: { id: true, name: true, address: true, city: true } },
          },
        },
        relocationInterest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      notices.map(async (notice) => {
        const [inspection, depositReturn] = await Promise.all([
          InspectionMoveOutService.findInspectionForNotice(notice.id, notice.tenantId),
          this.resolveDepositReturnDeadline(landlordId, notice.intendedMoveOutDate),
        ]);
        return this.enrichNoticeWithDepositReturn(
          { ...notice, inspection },
          depositReturn
        );
      })
    );
  }

  async countPendingForLandlord(landlordId: string) {
    return prismaClient.moveOutNotice.count({
      where: {
        tenant: { landlordId, isDeleted: false },
        status: MoveOutNoticeStatus.PENDING,
      },
    });
  }

  async acknowledge(noticeId: string, landlordId: string, acknowledgedByUserId: string) {
    const notice = await prismaClient.moveOutNotice.findFirst({
      where: {
        id: noticeId,
        tenant: { landlordId, isDeleted: false },
      },
      include: {
        tenant: {
          include: {
            user: { select: { id: true } },
            property: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!notice) {
      throw new Error('NOTICE_NOT_FOUND');
    }
    if (notice.status !== MoveOutNoticeStatus.PENDING) {
      throw new Error('NOTICE_ALREADY_ACKNOWLEDGED');
    }

    const depositReturn = await this.resolveDepositReturnDeadline(
      landlordId,
      notice.intendedMoveOutDate
    );

    const updated = await prismaClient.moveOutNotice.update({
      where: { id: noticeId },
      data: {
        status: MoveOutNoticeStatus.ACKNOWLEDGED,
        acknowledgedBy: acknowledgedByUserId,
        acknowledgedAt: new Date(),
        ...(depositReturn
          ? {
              searchCriteria: {
                ...(typeof notice.searchCriteria === 'object' && notice.searchCriteria
                  ? (notice.searchCriteria as Record<string, unknown>)
                  : {}),
                depositReturnDeadline: depositReturn.deadline.toISOString(),
                depositReturnDays: depositReturn.days,
              },
            }
          : {}),
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullname: true, firstName: true, lastName: true } },
              },
            },
            property: { select: { id: true, name: true } },
          },
        },
        relocationInterest: true,
      },
    });

    const { notifyUser } = await import('./notify');
    await Promise.all([
      notifyUser({
        userId: notice.tenant.userId,
        sourceId: acknowledgedByUserId,
        type: 'move_out_acknowledged',
        message: depositReturn
          ? `Your landlord has acknowledged your move-out notice for ${notice.tenant.property?.name || 'your property'}. Security deposit must be returned by ${depositReturn.deadline.toLocaleDateString('en-GB')} (${depositReturn.days} day${depositReturn.days === 1 ? '' : 's'} after move-out).`
          : `Your landlord has acknowledged your move-out notice for ${notice.tenant.property?.name || 'your property'}.`,
        route: '/profile/TenancyInfo',
      }),
      LogsServices.createLog({
        events: appendActivityLogRef(
          `Landlord acknowledged move-out notice for ${notice.tenant.property?.name || 'the property'}`,
          { type: 'notice', id: noticeId }
        ),
        type: LogType.ACTIVITY,
        propertyId: notice.tenant.propertyId,
        createdById: notice.tenant.userId,
        subjects: 'Move-out notice acknowledged',
      }),
    ]);

    return this.enrichNoticeWithDepositReturn(updated, depositReturn);
  }
}

export default new MoveOutNoticeService();
