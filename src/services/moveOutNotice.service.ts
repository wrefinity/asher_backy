import {
  MoveOutNoticeStatus,
  MoveOutNoticeType,
  NotificationCategory,
  Prisma,
} from '@prisma/client';
import { prismaClient } from '../db/prismaClient';
import NotificationService from './notification.service';
import LogsServices from './logs.services';
import { LogType } from '@prisma/client';
import InspectionMoveOutService from './inspectionMoveOut.service';
import { appendActivityLogRef } from '../utils/activityLogRef.util';

export interface CreateMoveOutNoticeInput {
  tenantId: string;
  intendedMoveOutDate: Date;
  reason: string;
  comments?: string;
  type: MoveOutNoticeType;
  searchCriteria?: Prisma.InputJsonValue;
}

class MoveOutNoticeService {
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

    await NotificationService.createNotification(
      {
        sourceId: tenant.userId,
        destId: tenant.landlord.userId,
        title: 'Tenant Move-Out Notice',
        message: `${tenantName} has submitted a move-out notice (${typeLabel}). Intended move-out date: ${moveOutDateStr}. Reason: ${input.reason}.`,
        category: NotificationCategory.MOVE_OUT,
      },
      NotificationCategory.MOVE_OUT
    );

    await LogsServices.createLog({
      events: appendActivityLogRef(
        `${tenantName} submitted move-out notice (${typeLabel}) for ${moveOutDateStr}`,
        { type: 'notice', id: notice.id }
      ),
      type: LogType.ACTIVITY,
      propertyId: tenant.propertyId,
      createdById: tenant.userId,
      subjects: 'Move-out notice submitted',
    });

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

      await NotificationService.createNotification(
        {
          sourceId: tenant.userId,
          destId: tenant.landlord.userId,
          title: 'Move-Out Inspection Scheduled',
          message: `${tenantName} submitted a move-out notice. A move-out inspection has been scheduled for ${moveOutDateStr}.`,
          notificationType: 'inspection_scheduled',
          route: `/service/inspections/${inspection.id}`,
        },
        NotificationCategory.MOVE_OUT
      );

      if (tenant.userId) {
        await NotificationService.createNotification(
          {
            sourceId: tenant.landlord.userId,
            destId: tenant.userId,
            title: 'Move-Out Inspection Scheduled',
            message: `Your landlord will conduct a move-out inspection around ${moveOutDateStr}.`,
            notificationType: 'inspection_scheduled',
            route: `/inspections/${inspection.id}`,
          },
          NotificationCategory.MOVE_OUT
        );
      }

      await LogsServices.createLog({
        events: appendActivityLogRef(
          `Move-out inspection scheduled for ${moveOutDateStr}`,
          { type: 'inspection', id: inspection.id }
        ),
        type: LogType.ACTIVITY,
        propertyId: tenant.propertyId,
        createdById: tenant.userId,
        subjects: 'Move-out inspection scheduled',
      });
    } catch (inspectionErr) {
      console.warn('Failed to auto-create move-out inspection', inspectionErr);
    }

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
        const inspection = await InspectionMoveOutService.findInspectionForNotice(
          notice.id,
          notice.tenantId
        );
        return { ...notice, inspection };
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

    const updated = await prismaClient.moveOutNotice.update({
      where: { id: noticeId },
      data: {
        status: MoveOutNoticeStatus.ACKNOWLEDGED,
        acknowledgedBy: acknowledgedByUserId,
        acknowledgedAt: new Date(),
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

    await NotificationService.createNotification(
      {
        sourceId: acknowledgedByUserId,
        destId: notice.tenant.userId,
        title: 'Move-Out Notice Acknowledged',
        message: `Your landlord has acknowledged your move-out notice for ${notice.tenant.property?.name || 'your property'}.`,
        notificationType: 'move_out_acknowledged',
        route: '/profile/TenancyInfo',
      },
      NotificationCategory.MOVE_OUT
    );

    await LogsServices.createLog({
      events: appendActivityLogRef(
        `Landlord acknowledged move-out notice for ${notice.tenant.property?.name || 'the property'}`,
        { type: 'notice', id: noticeId }
      ),
      type: LogType.ACTIVITY,
      propertyId: notice.tenant.propertyId,
      createdById: notice.tenant.userId,
      subjects: 'Move-out notice acknowledged',
    });

    return updated;
  }
}

export default new MoveOutNoticeService();
