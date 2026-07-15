import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { prismaClient } from '../..';
import InspectionService from '../../services/inspection.services';
import InspectionCertificateService from '../../services/inspectionCertificate.service';
import InspectionChatService from '../../services/inspectionChat.service';
import InspectionActivityLogService from '../../services/inspectionActivityLog.service';
import {
  inspectionNeedsScheduleAcknowledgment,
  mapInspectionForTenant,
  normalizeInspectionStatus,
} from '../../utils/inspectionTenantMapper.util';

const STATUS_FILTER_MAP: Record<string, string[]> = {
  pending: ['Scheduled', 'Not Started'],
  in_progress: ['In Progress'],
  completed: ['Completed'],
  cancelled: ['Cancelled'],
};

class TenantInspectionController {
  private resolveTenant = async (userId: string) =>
    prismaClient.tenants.findFirst({
      where: {
        userId,
        isCurrentLease: true,
      },
    });

  /**
   * Get all inspections for the authenticated tenant
   */
  getTenantInspections = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { status } = req.query;

    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      return res.status(200).json(
        ApiResponse.success({ inspections: [] }, 'No active tenant found')
      );
    }

    const whereClause: any = {
      tenantId: tenant.id,
      // Draft inspections are landlord-only until scheduled
      NOT: { status: 'Draft' },
    };

    if (typeof status === 'string' && status.trim()) {
      const normalizedStatus = status.trim().toLowerCase();
      const mappedStatuses = STATUS_FILTER_MAP[normalizedStatus];
      if (mappedStatuses?.length) {
        whereClause.status = { in: mappedStatuses };
      }
    }

    const inspections = await prismaClient.inspection.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        acknowledgment: true,
        sections: {
          include: {
            items: {
              include: {
                photos: true,
              },
            },
            photos: true,
          },
        },
        certificates: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mappedInspections = inspections.map(mapInspectionForTenant);

    return res.status(200).json(
      ApiResponse.success(
        { inspections: mappedInspections },
        'Tenant inspections retrieved successfully'
      )
    );
  });

  /**
   * Get inspection statistics for tenant
   */
  getTenantInspectionStats = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      return res.status(200).json(
        ApiResponse.success(
          {
            stats: {
              total: 0,
              pending: 0,
              completed: 0,
              needsAcknowledgment: 0,
              needsScheduleAcknowledgment: 0,
              withDisputes: 0,
            },
          },
          'No active tenant found'
        )
      );
    }

    const inspections = await prismaClient.inspection.findMany({
      where: {
        tenantId: tenant.id,
        NOT: { status: 'Draft' },
      },
      include: {
        acknowledgment: true,
      },
    });

    const stats = {
      total: inspections.length,
      pending: inspections.filter((i) => {
        const status = normalizeInspectionStatus(i.status);
        return status === 'pending' || status === 'in_progress';
      }).length,
      completed: inspections.filter(
        (i) => normalizeInspectionStatus(i.status) === 'completed'
      ).length,
      needsAcknowledgment: inspections.filter(
        (i) =>
          normalizeInspectionStatus(i.status) === 'completed' &&
          i.acknowledgment &&
          !i.acknowledgment.acknowledged
      ).length,
      needsScheduleAcknowledgment: inspections.filter((i) =>
        inspectionNeedsScheduleAcknowledgment(i)
      ).length,
      withDisputes: inspections.filter(
        (i) => i.acknowledgment && i.acknowledgment.disputed === true
      ).length,
    };

    return res.status(200).json(
      ApiResponse.success({ stats }, 'Inspection statistics retrieved successfully')
    );
  });

  /**
   * Get inspection by ID (tenant must be assigned to it)
   */
  getInspectionById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    const inspection = await InspectionService.getCompleteInspection(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    if (inspection.status === 'Draft') {
      throw ApiError.notFound('Inspection not found');
    }

    return res.status(200).json(
      ApiResponse.success(
        { inspection: mapInspectionForTenant(inspection) },
        'Inspection retrieved successfully'
      )
    );
  });

  /**
   * Tenant confirms they received / acknowledge a scheduled appointment
   * (lightweight — not the completed-report signature flow).
   */
  acknowledgeInspectionSchedule = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    const inspection = await prismaClient.inspection.findUnique({
      where: { id },
    });

    if (!inspection || inspection.status === 'Draft') {
      throw ApiError.notFound('Inspection not found');
    }

    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    if (!inspectionNeedsScheduleAcknowledgment(inspection)) {
      if (inspection.tenantScheduleAcknowledgedAt) {
        return res.status(200).json(
          ApiResponse.success(
            {
              inspection: mapInspectionForTenant(inspection),
              alreadyAcknowledged: true,
            },
            'Schedule already acknowledged'
          )
        );
      }
      throw ApiError.badRequest(
        'This inspection schedule cannot be acknowledged in its current status'
      );
    }

    const updated = await prismaClient.inspection.update({
      where: { id },
      data: { tenantScheduleAcknowledgedAt: new Date() },
      include: {
        property: true,
        acknowledgment: true,
      },
    });

    try {
      const { notifyUser, resolveLandlordUserFromPropertyId } = await import(
        '../../services/notify'
      );
      const landlord = await resolveLandlordUserFromPropertyId(updated.propertyId);
      if (landlord?.userId && landlord.userId !== userId) {
        const propertyName =
          (updated as { property?: { name?: string | null } }).property?.name ||
          'your property';
        await notifyUser({
          userId: landlord.userId,
          sourceId: userId,
          type: 'inspection_schedule_acknowledged',
          title: 'Schedule acknowledged',
          message: `Tenant acknowledged the inspection schedule for ${propertyName}.`,
          route: `/service/inspections/${updated.id}`,
        });
      }
    } catch (notifyErr) {
      console.warn('Non-critical: schedule-ack landlord notify failed', notifyErr);
    }

    return res.status(200).json(
      ApiResponse.success(
        { inspection: mapInspectionForTenant(updated) },
        'Inspection schedule acknowledged'
      )
    );
  });

  /**
   * Acknowledge inspection (tenant signs off)
   */
  acknowledgeInspection = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { signature, comments, hasDisputes } = req.body;

    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    const inspection = await InspectionService.getInspectionById(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    const existingAcknowledgment = await prismaClient.inspectionAcknowledgment.findUnique({
      where: { inspectionId: id },
    });

    if (!existingAcknowledgment) {
      throw ApiError.badRequest('Inspection has not been shared with you yet');
    }

    if (existingAcknowledgment.acknowledged) {
      throw ApiError.badRequest('Inspection already acknowledged');
    }

    if (normalizeInspectionStatus(inspection.status) !== 'completed') {
      throw ApiError.badRequest('Inspection must be completed before acknowledgment');
    }

    const updatedAcknowledgment = await prismaClient.inspectionAcknowledgment.update({
      where: { inspectionId: id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        signature: signature || null,
        comments: comments || null,
        disputed: hasDisputes || false,
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                email: true,
                profile: {
                  select: {
                    fullname: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const [property] = await Promise.all([
      inspection.propertyId
        ? prismaClient.properties.findUnique({
            where: { id: inspection.propertyId },
            select: { name: true, landlordId: true },
          })
        : Promise.resolve(null),
      InspectionCertificateService.generateCertificate(id, 'tenant', userId).catch((certErr) => {
        console.warn('Failed to generate tenant certificate after acknowledgment', certErr);
        return null;
      }),
      hasDisputes
        ? InspectionChatService.ensureDisputeChatRoom(id).catch((chatErr) => {
            console.warn('Failed to open inspection dispute chat', chatErr);
            return null;
          })
        : Promise.resolve(null),
    ]);

    const sideEffects: Array<Promise<unknown>> = [];
    if (property?.landlordId) {
      const landlord = await prismaClient.landlords.findUnique({
        where: { id: property.landlordId },
        select: { userId: true },
      });

      if (landlord?.userId) {
        sideEffects.push(
          (async () => {
            try {
              const { notifyUser } = await import('../../services/notify');
              await notifyUser({
                userId: landlord.userId,
                sourceId: userId,
                type: hasDisputes
                  ? 'inspection_disputed'
                  : 'inspection_acknowledged',
                title: hasDisputes
                  ? 'Inspection Acknowledged With Disputes'
                  : 'Inspection Acknowledged',
                message: hasDisputes
                  ? `The tenant acknowledged the inspection for ${property.name} but raised disputes. Please review their comments.`
                  : `The tenant has acknowledged the inspection report for ${property.name}.`,
                route: `/service/inspections/${id}`,
              });
            } catch (notifErr) {
              console.warn(
                'Failed to notify landlord about inspection acknowledgment',
                notifErr
              );
            }
          })()
        );
      }
    }

    if (inspection.propertyId) {
      sideEffects.push(
        InspectionActivityLogService.logEvent({
          propertyId: inspection.propertyId,
          tenantUserId: userId,
          inspectionId: id,
          subjects: hasDisputes
            ? 'Inspection acknowledged with disputes'
            : 'Inspection acknowledged',
          events: hasDisputes
            ? `Tenant acknowledged the inspection with disputes for ${property?.name || 'the property'}`
            : `Tenant acknowledged the inspection for ${property?.name || 'the property'}`,
        }).catch((logErr) => {
          console.warn('Failed to write inspection acknowledgment activity log', logErr);
        })
      );
    }
    await Promise.all(sideEffects);

    return res.status(200).json(
      ApiResponse.success(
        {
          message: 'Inspection acknowledged successfully',
          acknowledgment: {
            ...updatedAcknowledgment,
            hasDisputes: updatedAcknowledgment.disputed,
          },
        },
        'Inspection acknowledged successfully'
      )
    );
  });

  /**
   * Get inspection certificate
   */
  getInspectionCertificate = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { type = 'tenant' } = req.query;

    const tenant = await this.resolveTenant(userId);

    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    const inspection = await InspectionService.getInspectionById(id);

    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }

    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    const certificateType = type as 'tenant' | 'landlord';
    if (certificateType === 'tenant') {
      const acknowledgment = await prismaClient.inspectionAcknowledgment.findUnique({
        where: { inspectionId: id },
      });

      if (!acknowledgment?.acknowledged) {
        throw ApiError.badRequest(
          'Inspection must be acknowledged before downloading the tenant certificate'
        );
      }
    }

    const certificate = await InspectionCertificateService.generateCertificate(
      id,
      certificateType,
      userId
    );

    return res.status(200).json(
      ApiResponse.success(
        {
          certificate: {
            ...certificate,
            certificateType: certificate.type,
            certificateUrl: certificate.pdfUrl,
          },
        },
        'Certificate retrieved successfully'
      )
    );
  });

  getDisputeChat = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const chat = await InspectionChatService.getDisputeChat(id, userId);
      return res.status(200).json(ApiResponse.success(chat, 'Dispute chat retrieved'));
    } catch (error: any) {
      if (error.message === 'DISPUTE_CHAT_NOT_AVAILABLE') {
        return res.status(200).json(
          ApiResponse.success(
            { available: false, messages: [], chatRoomId: null },
            'Dispute chat is not available for this inspection'
          )
        );
      }
      if (error.statusCode === 403) throw ApiError.forbidden('You do not have access to this chat');
      if (error.statusCode === 404) throw ApiError.notFound('Inspection not found');
      throw error;
    }
  });

  sendDisputeMessage = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { content } = req.body as { content?: string };

    try {
      const message = await InspectionChatService.sendDisputeMessage(
        id,
        userId,
        content || ''
      );
      return res.status(201).json(
        ApiResponse.success({ message }, 'Dispute message sent')
      );
    } catch (error: any) {
      if (error.message === 'DISPUTE_CHAT_NOT_AVAILABLE') {
        throw ApiError.badRequest('Dispute chat is only available when a dispute has been raised');
      }
      if (error.message === 'MESSAGE_REQUIRED') {
        throw ApiError.badRequest('Message content is required');
      }
      if (error.statusCode === 403) throw ApiError.forbidden('You do not have access to this chat');
      if (error.statusCode === 404) throw ApiError.notFound('Inspection not found');
      throw error;
    }
  });

  /**
   * Raise a dispute after the tenant already certified the inspection (within review window).
   */
  raiseInspectionDispute = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { comments } = req.body as { comments?: string };

    if (!comments?.trim()) {
      throw ApiError.badRequest('Please explain what you disagree with');
    }

    const tenant = await this.resolveTenant(userId);
    if (!tenant) {
      throw ApiError.badRequest('No active tenant found');
    }

    const inspection = await InspectionService.getInspectionById(id);
    if (!inspection) {
      throw ApiError.notFound('Inspection not found');
    }
    if (inspection.tenantId !== tenant.id) {
      throw ApiError.forbidden('You do not have access to this inspection');
    }

    const existingAcknowledgment = await prismaClient.inspectionAcknowledgment.findUnique({
      where: { inspectionId: id },
    });

    if (!existingAcknowledgment?.acknowledged) {
      throw ApiError.badRequest(
        'Please review and sign the inspection first, or use sign with disputes during acknowledgment'
      );
    }

    if (existingAcknowledgment.disputed) {
      throw ApiError.badRequest('A dispute has already been raised for this inspection');
    }

    const mergedComments = existingAcknowledgment.comments
      ? `${existingAcknowledgment.comments}\n\n--- Dispute raised ---\n${comments.trim()}`
      : comments.trim();

    const updatedAcknowledgment = await prismaClient.inspectionAcknowledgment.update({
      where: { inspectionId: id },
      data: {
        disputed: true,
        comments: mergedComments,
      },
    });

    try {
      await InspectionChatService.ensureDisputeChatRoom(id);
      // Opening message is covered by inspection_disputed notify below — avoid double bell.
      await InspectionChatService.sendDisputeMessage(
        id,
        userId,
        comments.trim(),
        { skipNotification: true }
      );
    } catch (chatErr) {
      console.warn('Failed to open dispute chat after raise-dispute', chatErr);
    }

    const property = inspection.propertyId
      ? await prismaClient.properties.findUnique({
          where: { id: inspection.propertyId },
          select: { name: true, landlordId: true },
        })
      : null;

    const sideEffects: Array<Promise<unknown>> = [];
    if (property?.landlordId) {
      const landlord = await prismaClient.landlords.findUnique({
        where: { id: property.landlordId },
        select: { userId: true },
      });

      if (landlord?.userId) {
        sideEffects.push(
          (async () => {
            try {
              const { notifyUser } = await import('../../services/notify');
              await notifyUser({
                userId: landlord.userId,
                sourceId: userId,
                type: 'inspection_disputed',
                title: 'Inspection dispute raised',
                message: `The tenant raised a dispute on the inspection for ${property.name}. Please review their comments.`,
                route: `/service/inspections/${id}`,
              });
            } catch (notifyErr) {
              console.warn(
                'Failed to notify landlord of inspection dispute',
                notifyErr
              );
            }
          })()
        );
      }
    }

    if (inspection.propertyId) {
      sideEffects.push(
        InspectionActivityLogService.logEvent({
          propertyId: inspection.propertyId,
          tenantUserId: userId,
          inspectionId: id,
          subjects: 'Inspection dispute raised',
          events: `Tenant raised a dispute on the inspection for ${property?.name || 'the property'}`,
        }).catch((logErr) => {
          console.warn('Failed to write inspection dispute activity log', logErr);
        })
      );
    }
    await Promise.all(sideEffects);

    return res.status(200).json(
      ApiResponse.success(
        {
          acknowledgment: {
            ...updatedAcknowledgment,
            hasDisputes: true,
          },
        },
        'Dispute raised successfully. You can continue the discussion below.'
      )
    );
  });
}

export default new TenantInspectionController();
