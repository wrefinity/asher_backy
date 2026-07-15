import { Response } from 'express';
import InspectionService from '../../services/inspection.services';
import InspectionPhotoService from '../../services/inspectionPhoto.service';
import InspectionCertificateService from '../../services/inspectionCertificate.service';
import InspectionChatService from '../../services/inspectionChat.service';
import NotificationService from '../../services/notification.service';
import {
  createInspectionSchema,
  updateInspectionSchema,
} from '../../validations/schemas/inspection.schema';
import { CustomRequest } from '../../utils/types';
import propertyServices from '../../services/propertyServices';
import { prismaClient } from '../..';
import logger from '../../utils/loggers';
import LogsServices from '../../services/logs.services';
import InspectionActivityLogService from '../../services/inspectionActivityLog.service';
import { appendActivityLogRef } from '../../utils/activityLogRef.util';
import { LogType } from '@prisma/client';
import LandlordSettingsService from '../services/propertySetting.service';
import { resolveFinancialRules } from '../../utils/globalSettings.util';
import {
  resolveInspectionScheduledAt,
  validateInspectionNotice,
} from '../../utils/settingsEnforcement.util';
import moveOutNoticeService from '../../services/moveOutNotice.service';
import InspectionGuestService from '../../services/inspectionGuest.service';


class InspectionController {


  createInspection = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = createInspectionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      if (!landlordId) {
        return res.status(403).json({ error: 'Landlord not found' });
      }

      const property = await propertyServices.getPropertyById(
        req.body.propertyId
      );
      if (!property) {
        console.error('❌ Property not found:', req.body.propertyId);
        return res.status(404).json({ error: 'Property not found' });
      }

      if (property.landlordId !== landlordId) {
        console.error('❌ Unauthorized: Property landlordId:', property.landlordId, 'User landlordId:', landlordId);
        return res.status(403).json({ error: 'Unauthorized: You do not own this property' });
      }

      const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
      const rules = resolveFinancialRules(
        globalSettings,
        Number(property.price ?? 0),
        property.priceFrequency
      );
      const scheduledAt = resolveInspectionScheduledAt(
        req.body.scheduledDate,
        req.body.scheduledTime
      );
      // Draft inspections do not enforce notice window until landlord schedules
      if (scheduledAt && req.body.status !== 'Draft') {
        const noticeCheck = validateInspectionNotice(
          scheduledAt,
          rules.inspectionNoticeHours
        );
        if (!noticeCheck.valid) {
          return res.status(400).json({ error: noticeCheck.error });
        }
      }

      console.log('✅ Property verified, creating inspection...');
      const inspection = await InspectionService.createInspection(req.body);
      console.log('✅ Inspection created successfully:', inspection.id);

      const scheduledLabel = inspection.scheduledDate
        ? new Date(inspection.scheduledDate).toLocaleDateString('en-GB')
        : null;
      const typeLabel = inspection.type?.trim() || 'Inspection';
      const isDraft = inspection.status === 'Draft';
      try {
        await LogsServices.createLog({
          propertyId: inspection.propertyId,
          events: appendActivityLogRef(
            isDraft
              ? `${typeLabel} draft created (awaiting schedule)`
              : scheduledLabel
                ? `${typeLabel} booked for ${scheduledLabel}`
                : `${typeLabel} booked`,
            { type: 'inspection', id: inspection.id }
          ),
          type: LogType.ACTIVITY,
          createdById: req.user?.id,
          subjects: isDraft ? 'Inspection draft created' : 'Inspection booked',
        });
      } catch (logErr) {
        console.warn('Failed to write inspection-booked activity log', logErr);
      }

      // Send notification to tenant if inspection is scheduled and tenant is assigned
      if (inspection.tenantId && inspection.status === 'Scheduled') {
        try {
          const tenant = await prismaClient.tenants.findUnique({
            where: { id: inspection.tenantId },
            select: { userId: true },
          });

          if (tenant?.userId) {
            await NotificationService.createNotification({
              destId: tenant.userId,
              title: 'Inspection Scheduled',
              message: `An inspection has been scheduled for ${property.name} on ${inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : 'TBD'}.`,
              notificationType: 'inspection_scheduled',
              route: `/inspections/${inspection.id}`,
              emitRealtime: true,
              type: 'info',
            }, 'COMMUNICATION');

            await InspectionActivityLogService.logEvent({
              propertyId: inspection.propertyId,
              tenantUserId: tenant.userId,
              inspectionId: inspection.id,
              subjects: 'Inspection scheduled',
              events: `Inspection scheduled for ${property.name}`,
            });
          }
        } catch (notifError) {
          console.warn('⚠️ Failed to send notification (non-critical):', notifError);
        }
      }

      res.status(201).json(inspection);
    } catch (error: any) {
      console.error('❌ Error creating inspection:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        name: error.name,
      });
      res.status(500).json({
        error: 'Failed to create inspection',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          meta: error.meta,
        } : undefined,
      });
    }
  }

  getLandlordInspections = async (req: CustomRequest, res: Response) => {
    try {
      // Check if user has landlord record
      const landlordId = req.user.landlords.id;
      logger.info('[checker]: Landlord ID:', landlordId);
      if (!landlordId) {
        return res.status(403).json({ error: 'Landlord not found' });
      }
      const inspections = await prismaClient.inspection.findMany({
        where: {
          property: {
            landlordId: landlordId,
          },
        },
        include: {
          tenant: true,
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(inspections);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
      const errorMessage = error?.message || 'Failed to fetch inspections';
      res.status(500).json({ error: errorMessage });
    }
  }


  getLandlordPropertyInspection = async (req: CustomRequest, res: Response) => {
    try {
      // Check if user has landlord record
      const landlordId = req.user.landlords.id;
      if (!landlordId) {
        return res.status(403).json({ error: 'Landlord not found' });
      }

      const propertyId = req.params.propertyId as string;

      // If propertyId is provided, get inspections for that property
      if (propertyId) {
        // Verify landlord owns the property EFFICIENTLY
        const property = await prismaClient.properties.findFirst({
          where: { id: propertyId, landlordId: landlordId },
          select: { id: true }
        });
        if (!property) {
          return res.status(403).json({ error: 'Unauthorized or Property not found' });
        }

        const inspections = await InspectionService.getInspectionsByProperty(
          propertyId
        );
        return res.json(inspections);
      }

      // If no propertyId, return all inspections for landlord's properties
      const allProperties = await propertyServices.getLandlordProperties(landlordId);
      const propertyIds = allProperties.map((p: any) => p.id);

      if (propertyIds.length === 0) {
        return res.json([]);
      }

      // Fetch all inspections for the landlord's properties in a single query
      const allInspections = await prismaClient.inspection.findMany({
        where: {
          propertyId: {
            in: propertyIds,
          },
        },
        include: { tenant: true },
      });

      res.json(allInspections);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
      const errorMessage = error?.message || 'Failed to fetch inspections';
      res.status(500).json({ error: errorMessage });
    }
  }

  getInspectionById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error fetching inspection:', error);
      res.status(500).json({ error: 'Failed to fetch inspection' });
    }
  }

  updateInspection = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = updateInspectionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const inspection = await InspectionService.getInspectionById(
        req.params.id
      );
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (req.body.scheduledDate !== undefined) {
        const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
        const rules = resolveFinancialRules(
          globalSettings,
          Number(property.price ?? 0),
          property.priceFrequency
        );
        const scheduledAt = resolveInspectionScheduledAt(
          req.body.scheduledDate,
          req.body.scheduledTime ?? inspection.scheduledTime
        );
        if (scheduledAt) {
          const noticeCheck = validateInspectionNotice(
            scheduledAt,
            rules.inspectionNoticeHours
          );
          if (!noticeCheck.valid) {
            return res.status(400).json({ error: noticeCheck.error });
          }
        }
      }

      // Final documents require inspector + landlord signatures; tenant signature when occupied.
      if (req.body.status === 'Completed' && inspection.status !== 'Completed') {
        const inspectorSignature =
          req.body.inspectorSignature || inspection.inspectorSignature || null;
        const landlordSignature =
          req.body.landlordSignature || inspection.landlordSignature || null;
        const tenantSignature =
          req.body.onSiteSignature ||
          inspection.onSiteSignature ||
          (await prismaClient.inspectionAcknowledgment.findUnique({
            where: { inspectionId: inspection.id },
            select: { signature: true },
          }))?.signature ||
          null;

        const missing: string[] = [];
        if (!inspectorSignature) missing.push('inspector');
        if (!landlordSignature) missing.push('landlord');
        if (inspection.tenantId && !tenantSignature) missing.push('tenant');

        if (missing.length > 0) {
          return res.status(400).json({
            error: `Signatures required before final documents: ${missing.join(', ')}`,
            missingSignatures: missing,
          });
        }

        // Keep signatures on the record even if only passed in body
        req.body.inspectorSignature = inspectorSignature;
        req.body.landlordSignature = landlordSignature;
        if (tenantSignature) req.body.onSiteSignature = tenantSignature;
      }

      const updatedInspection = await InspectionService.updateInspection(
        req.params.id,
        req.body
      );

      const becameScheduled =
        req.body.status === 'Scheduled' && inspection.status === 'Draft';
      const becameCompleted =
        req.body.status === 'Completed' && inspection.status !== 'Completed';

      // Draft → Scheduled: notify tenant of appointment + ack linked move-out notice
      if (becameScheduled) {
        const dateLabel = updatedInspection.scheduledDate
          ? new Date(updatedInspection.scheduledDate).toLocaleDateString('en-GB')
          : 'TBD';
        const timeLabel = updatedInspection.scheduledTime
          ? ` at ${updatedInspection.scheduledTime}`
          : '';

        try {
          const tenant = updatedInspection.tenantId
            ? await prismaClient.tenants.findUnique({
                where: { id: updatedInspection.tenantId },
                select: { userId: true },
              })
            : null;

          if (tenant?.userId) {
            await NotificationService.createNotification(
              {
                destId: tenant.userId,
                title: 'Inspection appointment scheduled',
                message: `An inspection for ${property.name} is scheduled for ${dateLabel}${timeLabel}. Please prepare the property.`,
                notificationType: 'inspection_scheduled',
                route: `/inspections/${updatedInspection.id}`,
                emitRealtime: true,
                type: 'info',
              },
              'COMMUNICATION'
            );

            await InspectionActivityLogService.logEvent({
              propertyId: updatedInspection.propertyId,
              tenantUserId: tenant.userId,
              inspectionId: updatedInspection.id,
              subjects: 'Inspection scheduled',
              events: `Inspection appointment scheduled for ${dateLabel}${timeLabel}`,
            });
          }

          await LogsServices.createLog({
            propertyId: updatedInspection.propertyId,
            events: appendActivityLogRef(
              `Inspection scheduled for ${dateLabel}${timeLabel}`,
              { type: 'inspection', id: updatedInspection.id }
            ),
            type: LogType.ACTIVITY,
            createdById: req.user?.id,
            subjects: 'Inspection scheduled',
          });
        } catch (scheduleSideEffectErr) {
          console.warn(
            'Non-critical failure after Draft→Scheduled',
            scheduleSideEffectErr
          );
        }

        const noticeId = updatedInspection.moveOutNoticeId || inspection.moveOutNoticeId;
        if (noticeId && req.user?.id) {
          try {
            await moveOutNoticeService.acknowledge(
              noticeId,
              landlordId,
              req.user.id
            );
          } catch (ackErr: any) {
            if (ackErr?.message === 'NOTICE_ALREADY_ACKNOWLEDGED') {
              // Expected if landlord already acked — ignore
            } else {
              console.warn('Failed to acknowledge move-out notice on schedule', {
                noticeId,
                landlordId,
                error: ackErr?.message || ackErr,
              });
            }
          }
        }
      }

      if (
        becameCompleted ||
        (req.body.completedAt && !inspection.completedAt)
      ) {
        const typeLabel = updatedInspection.type?.trim() || 'Inspection';
        try {
          await LogsServices.createLog({
            propertyId: updatedInspection.propertyId,
            events: appendActivityLogRef(`${typeLabel} completed`, {
              type: 'inspection',
              id: updatedInspection.id,
            }),
            type: LogType.ACTIVITY,
            createdById: req.user?.id,
            subjects: 'Inspection completed',
          });
        } catch (logErr) {
          console.warn('Failed to write inspection-completed activity log', logErr);
        }
      }

      // Send notification when inspection is marked as completed + auto-certify
      if (becameCompleted) {
        const [tenant, landlordUser] = await Promise.all([
          updatedInspection.tenantId
            ? prismaClient.tenants.findUnique({
                where: { id: updatedInspection.tenantId },
                select: { userId: true },
              })
            : Promise.resolve(null),
          prismaClient.landlords.findUnique({
            where: { id: landlordId },
            select: { userId: true },
          }),
        ]);

        // Auto-generate landlord certificate. On-site sign-off also issues tenant cert + acknowledgment.
        const onSiteSignature =
          updatedInspection.onSiteSignature ||
          inspection.onSiteSignature ||
          req.body.onSiteSignature ||
          null;

        try {
          await InspectionCertificateService.generateCertificate(
            updatedInspection.id,
            'landlord',
            req.user.id
          );
          if (updatedInspection.tenantId && onSiteSignature) {
            const existingAck = await prismaClient.inspectionAcknowledgment.findUnique({
              where: { inspectionId: updatedInspection.id },
            });
            if (!existingAck) {
              await prismaClient.inspectionAcknowledgment.create({
                data: {
                  inspectionId: updatedInspection.id,
                  tenantId: updatedInspection.tenantId,
                  acknowledged: true,
                  signature: String(onSiteSignature),
                  acknowledgedAt: new Date(),
                  disputed: false,
                },
              });
            } else if (!existingAck.acknowledged) {
              await prismaClient.inspectionAcknowledgment.update({
                where: { id: existingAck.id },
                data: {
                  acknowledged: true,
                  signature: String(onSiteSignature),
                  acknowledgedAt: new Date(),
                },
              });
            }

            await InspectionCertificateService.generateCertificate(
              updatedInspection.id,
              'tenant',
              req.user.id
            );
          }
        } catch (certErr) {
          console.warn('Auto certificate generation failed (non-critical)', certErr);
        }

        const hasTenantCert =
          Boolean(updatedInspection.tenantId) && Boolean(onSiteSignature);

        const notifications: Array<Promise<unknown>> = [];
        if (tenant?.userId) {
          notifications.push(
            NotificationService.createNotification(
              {
                destId: tenant.userId,
                title: hasTenantCert
                  ? 'Inspection certificate available'
                  : 'Inspection completed',
                message: hasTenantCert
                  ? `The inspection for ${property.name} is complete. Your certificate is available in Documents.`
                  : `The inspection for ${property.name} is complete. Your certificate will appear in Documents once issued.`,
                notificationType: 'inspection_completed',
                route: '/inspections',
                emitRealtime: true,
                type: 'success',
              },
              'COMMUNICATION'
            )
          );
          notifications.push(
            InspectionActivityLogService.logEvent({
              propertyId: updatedInspection.propertyId,
              tenantUserId: tenant.userId,
              inspectionId: updatedInspection.id,
              subjects: hasTenantCert
                ? 'Inspection certificate available'
                : 'Inspection completed',
              events: hasTenantCert
                ? `Inspection certificate available for ${property.name}`
                : `Inspection completed for ${property.name}`,
            })
          );
        }

        if (landlordUser?.userId) {
          notifications.push(
            NotificationService.createNotification({
              destId: landlordUser.userId,
              title: 'Inspection Completed',
              message: `The inspection for ${property.name} has been marked as completed. Certificates were saved to documents.`,
              category: 'COMMUNICATION',
              notificationType: 'inspection_completed',
              route: `/service/inspections/${req.params.id}`,
              emitRealtime: true,
              type: 'success',
            })
          );
        }
        await Promise.all(notifications);
      }

      res.json(updatedInspection);
    } catch (error) {
      console.error('Error updating inspection:', error);
      res.status(500).json({ error: 'Failed to update inspection' });
    }
  }

  deleteInspection = async (req: CustomRequest, res: Response) => {
    try {
      const inspection = await InspectionService.getInspectionById(
        req.params.id
      );
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }
      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(
        inspection.propertyId
      );
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await InspectionService.deleteInspection(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete inspection' });
    }
  }

  // ============================================
  // NEW METHODS (Enhanced Inspection System)
  // ============================================

  /**
   * Get complete inspection with all details
   */
  getCompleteInspection = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const inspection = await InspectionService.getCompleteInspection(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      // Verify landlord owns the property
      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(inspection);
    } catch (error) {
      console.error('Error fetching complete inspection:', error);
      res.status(500).json({ error: 'Failed to fetch complete inspection' });
    }
  }

  /**
   * Save inspection sections with items
   */
  saveSections = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { sections } = req.body;

      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: 'Invalid sections data' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const savedSections = await InspectionService.saveSections(id, sections);
      res.json(savedSections);
    } catch (error) {
      console.error('Error saving inspection sections:', error);
      res.status(500).json({ error: 'Failed to save inspection sections' });
    }
  }

  /**
   * Upload photo for inspection item or section
   */
  uploadPhoto = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { itemId, sectionId, caption } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await InspectionPhotoService.uploadPhoto(
        req.file,
        itemId,
        sectionId,
        caption
      );

      res.json(result);
    } catch (error) {
      console.error('Error uploading inspection photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  }

  /**
   * Generate PDF certificate
   */
  generateCertificate = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { type } = req.query;

      if (!type || (type !== 'landlord' && type !== 'tenant')) {
        return res.status(400).json({ error: 'Invalid certificate type. Must be "landlord" or "tenant"' });
      }

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const [certificate, tenant] = await Promise.all([
        InspectionCertificateService.generateCertificate(
          id,
          type as 'landlord' | 'tenant',
          req.user.id
        ),
        inspection.tenantId
          ? prismaClient.tenants.findUnique({
              where: { id: inspection.tenantId },
              select: { userId: true },
            })
          : Promise.resolve(null),
      ]);

      const sideEffects: Array<Promise<unknown>> = [];
      if (inspection.propertyId && tenant?.userId) {
        sideEffects.push(
          InspectionActivityLogService.logEvent({
            propertyId: inspection.propertyId,
            tenantUserId: tenant.userId,
            inspectionId: id,
            subjects: 'Inspection certificate generated',
            events: `${type === 'tenant' ? 'Tenant' : 'Landlord'} inspection certificate generated for ${property.name}`,
          }).catch((logErr) => {
            console.warn('Failed to write inspection certificate activity log', logErr);
          })
        );
      }

      // Send notification to tenant if tenant certificate was generated
      if (type === 'tenant' && tenant?.userId) {
        sideEffects.push(
          NotificationService.createNotification(
            {
              destId: tenant.userId,
              title: 'Inspection Certificate Generated',
              message: `Your inspection certificate for ${property.name} has been generated and is ready for download.`,
              notificationType: 'inspection_certificate',
              route: '/profile/Documents',
            },
            'COMMUNICATION'
          )
        );
      }
      await Promise.all(sideEffects);

      res.json(certificate);
    } catch (error) {
      console.error('Error generating certificate:', error);
      res.status(500).json({ error: 'Failed to generate certificate' });
    }
  }

  /**
   * Share inspection with tenant
   */
  shareWithTenant = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Verify inspection exists and landlord owns it
      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (!inspection.tenantId) {
        return res.status(400).json({ error: 'No tenant assigned to this inspection' });
      }

      if (inspection.status !== 'Completed') {
        return res.status(400).json({ error: 'Inspection must be completed before sharing with tenant' });
      }

      const acknowledgment = await InspectionService.shareWithTenant(
        id,
        inspection.tenantId
      );

      const tenantUserId = acknowledgment.tenant?.userId;
      const sideEffects: Array<Promise<unknown>> = [];
      if (inspection.propertyId && tenantUserId) {
        sideEffects.push(
          InspectionActivityLogService.logEvent({
            propertyId: inspection.propertyId,
            tenantUserId,
            inspectionId: id,
            subjects: 'Inspection shared with tenant',
            events: `Inspection report shared with tenant for ${property.name}`,
          }).catch((logErr) => {
            console.warn('Failed to write inspection shared activity log', logErr);
          })
        );
      }

      // Send notification to tenant
      if (tenantUserId) {
        sideEffects.push(
          NotificationService.createNotification(
            {
              destId: tenantUserId,
              title: 'New Inspection Report',
              message: `Your landlord has shared an inspection report for ${property.name}. Please review and acknowledge.`,
              notificationType: 'inspection_report',
              route: `/inspections/acknowledge/${id}`,
            },
            'COMMUNICATION'
          )
        );
      }
      await Promise.all(sideEffects);

      res.json(acknowledgment);
    } catch (error: any) {
      console.error('Error sharing inspection:', error);
      res.status(500).json({ error: error?.message || 'Failed to share inspection with tenant' });
    }
  }

  /**
   * Get inspection statistics
   */
  getStatistics = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user.landlords?.id || req.user.id;
      const stats = await InspectionService.getInspectionStatistics(landlordId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching inspection statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  getDisputeChat = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const chat = await InspectionChatService.getDisputeChat(id, userId);
      return res.json(chat);
    } catch (error: any) {
      if (error.message === 'DISPUTE_CHAT_NOT_AVAILABLE') {
        return res.json({ available: false, messages: [], chatRoomId: null });
      }
      console.error('Error fetching inspection dispute chat:', error);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to fetch dispute chat',
      });
    }
  }

  sendDisputeMessage = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body as { content?: string };
      const userId = req.user.id;

      const inspection = await InspectionService.getInspectionById(id);
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const landlordId = req.user.landlords?.id || req.user.id;
      const property = await propertyServices.getPropertyById(inspection.propertyId);
      if (!property || property.landlordId !== landlordId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const message = await InspectionChatService.sendDisputeMessage(
        id,
        userId,
        content || ''
      );
      return res.status(201).json({ message });
    } catch (error: any) {
      if (error.message === 'DISPUTE_CHAT_NOT_AVAILABLE') {
        return res.status(400).json({
          error: 'Dispute chat is only available when a dispute has been raised',
        });
      }
      if (error.message === 'MESSAGE_REQUIRED') {
        return res.status(400).json({ error: 'Message content is required' });
      }
      console.error('Error sending inspection dispute message:', error);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to send dispute message',
      });
    }
  }

  inviteGuest = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user.landlords?.id;
      if (!landlordId) {
        return res.status(403).json({ error: 'Landlord not found' });
      }

      const { email, name, expiresInDays, inspectionIds } = req.body as {
        email?: string;
        name?: string;
        expiresInDays?: number;
        inspectionIds?: string[];
      };

      if (!email?.trim()) {
        return res.status(400).json({ error: 'Guest inspector email is required' });
      }

      const ids =
        Array.isArray(inspectionIds) && inspectionIds.length > 0
          ? inspectionIds
          : [req.params.id];

      const result = await InspectionGuestService.inviteGuest({
        inspectionIds: ids,
        landlordId,
        email,
        name: name || 'Inspector',
        expiresInDays,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      const map: Record<string, number> = {
        INSPECTION_NOT_FOUND: 404,
        INSPECTION_NOT_INVITABLE: 400,
        INVALID_EMAIL: 400,
      };
      const status = map[error?.message] || 500;
      return res.status(status).json({
        error:
          error?.message === 'INSPECTION_NOT_INVITABLE'
            ? 'Schedule the inspection before inviting a guest inspector'
            : error?.message || 'Failed to invite guest inspector',
      });
    }
  }
}

export default new InspectionController()
