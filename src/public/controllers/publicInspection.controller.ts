import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import InspectionGuestService from '../../services/inspectionGuest.service';
import InspectionPhotoService from '../../services/inspectionPhoto.service';
import NotificationService from '../../services/notification.service';
import { prismaClient } from '../..';
import { NotificationCategory } from '@prisma/client';

function mapGuestErr(err: any): never {
  if (err?.message === 'INVALID_TOKEN') throw ApiError.notFound('Invalid inspection link');
  if (err?.message === 'TOKEN_EXPIRED') throw ApiError.badRequest('This inspection link has expired');
  if (err?.message === 'INSPECTION_NOT_OPENABLE') {
    throw ApiError.badRequest('This inspection is no longer open for guest editing');
  }
  if (err?.message === 'INSPECTION_NOT_FOUND') throw ApiError.notFound('Inspection not found');
  if (err?.message === 'GUEST_ALREADY_SUBMITTED') {
    throw ApiError.badRequest('This inspection was already submitted');
  }
  if (err?.message === 'INSPECTOR_SIGNATURE_REQUIRED') {
    throw ApiError.badRequest('Inspector signature is required before submit');
  }
  throw err;
}

class PublicInspectionController {
  getPortal = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    try {
      const data = await InspectionGuestService.listPortalJobs(rawToken);
      return res.status(200).json(
        ApiResponse.success(
          {
            portal: data.portal,
            remainingCount: data.remainingCount,
            open: data.open.map((i) => ({
              id: i.id,
              type: i.type,
              status: i.status,
              scheduledDate: i.scheduledDate,
              scheduledTime: i.scheduledTime,
              priority: i.priority,
              property: i.property,
            })),
            submitted: data.submitted.map((i) => ({
              id: i.id,
              type: i.type,
              status: i.status,
              scheduledDate: i.scheduledDate,
              scheduledTime: i.scheduledTime,
              guestFormSubmittedAt: i.guestFormSubmittedAt,
              property: i.property,
            })),
          },
          'Guest portal loaded'
        )
      );
    } catch (err: any) {
      mapGuestErr(err);
    }
  });

  getInspection = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    const inspectionId = String(req.params.inspectionId || '');
    try {
      const { portal, inspection } = await InspectionGuestService.resolveInspectionForPortal(
        rawToken,
        inspectionId
      );
      return res.status(200).json(
        ApiResponse.success(
          {
            portal: {
              id: portal.id,
              name: portal.name,
              email: portal.email,
              expiresAt: portal.expiresAt,
            },
            inspection: {
              id: inspection.id,
              type: inspection.type,
              status: inspection.status,
              scheduledDate: inspection.scheduledDate,
              scheduledTime: inspection.scheduledTime,
              priority: inspection.priority,
              generalNotes: inspection.generalNotes,
              guestInspectorName: inspection.guestInspectorName,
              guestFormSubmittedAt: inspection.guestFormSubmittedAt,
              inspectorSignature: inspection.inspectorSignature,
              property: inspection.property,
              sections: inspection.sections,
            },
          },
          'Inspection loaded'
        )
      );
    } catch (err: any) {
      mapGuestErr(err);
    }
  });

  /** Legacy single-token GET — returns first open job + portal summary */
  getByToken = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    try {
      const data = await InspectionGuestService.listPortalJobs(rawToken);
      const first = data.open[0] || data.submitted[0];
      if (!first) {
        return res.status(200).json(
          ApiResponse.success(
            { portal: data.portal, remainingCount: 0, inspection: null },
            'No inspections assigned'
          )
        );
      }
      const { inspection } = await InspectionGuestService.resolveInspectionForPortal(
        rawToken,
        first.id
      );
      return res.status(200).json(
        ApiResponse.success(
          {
            portal: data.portal,
            remainingCount: data.remainingCount,
            inspection: {
              id: inspection.id,
              type: inspection.type,
              status: inspection.status,
              scheduledDate: inspection.scheduledDate,
              scheduledTime: inspection.scheduledTime,
              priority: inspection.priority,
              generalNotes: inspection.generalNotes,
              guestInspectorName: inspection.guestInspectorName,
              guestFormSubmittedAt: inspection.guestFormSubmittedAt,
              property: inspection.property,
              sections: inspection.sections,
            },
          },
          'Inspection loaded'
        )
      );
    } catch (err: any) {
      mapGuestErr(err);
    }
  });

  saveSections = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    const inspectionId = String(req.params.inspectionId || req.body?.inspectionId || '');
    const sections = req.body?.sections;
    if (!inspectionId) throw ApiError.badRequest('inspectionId is required');
    if (!Array.isArray(sections)) {
      throw ApiError.badRequest('sections array is required');
    }
    try {
      const saved = await InspectionGuestService.saveGuestSections(
        rawToken,
        inspectionId,
        sections
      );
      return res.status(200).json(ApiResponse.success({ sections: saved }, 'Sections saved'));
    } catch (err: any) {
      mapGuestErr(err);
    }
  });

  uploadPhoto = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    const inspectionId = String(req.params.inspectionId || req.body?.inspectionId || '');
    if (!inspectionId) throw ApiError.badRequest('inspectionId is required');

    try {
      const { inspection } = await InspectionGuestService.resolveInspectionForPortal(
        rawToken,
        inspectionId
      );
      InspectionGuestService.assertGuestCanEdit(inspection);
    } catch (err: any) {
      mapGuestErr(err);
    }

    if (!req.file) {
      throw ApiError.badRequest('photo file is required');
    }

    const itemId = req.body?.itemId as string | undefined;
    const sectionId = req.body?.sectionId as string | undefined;
    const caption = req.body?.caption as string | undefined;

    const photo = await InspectionPhotoService.uploadPhoto(
      req.file,
      itemId,
      sectionId,
      caption
    );

    return res.status(201).json(ApiResponse.created({ photo }, 'Photo uploaded'));
  });

  submit = asyncHandler(async (req: CustomRequest, res: Response) => {
    const rawToken = String(req.params.token || '');
    const inspectionId = String(req.params.inspectionId || req.body?.inspectionId || '');
    const inspectorSignature = (req.body?.inspectorSignature ||
      req.body?.onSiteSignature) as string | undefined;

    if (!inspectionId) throw ApiError.badRequest('inspectionId is required');

    try {
      const { updated, remainingCount } = await InspectionGuestService.submitGuestForm(
        rawToken,
        inspectionId,
        inspectorSignature
      );

      const landlord = await prismaClient.landlords.findUnique({
        where: { id: updated.property.landlordId },
        select: { userId: true },
      });

      if (landlord?.userId) {
        await NotificationService.createNotification(
          {
            destId: landlord.userId,
            title: 'Guest inspection submitted',
            message: `${updated.guestInspectorName || 'Guest inspector'} submitted the inspection for ${updated.property.name || 'your property'}. Add landlord (and tenant) signatures, then complete it.`,
            notificationType: 'inspection_guest_submitted',
            route: `/service/inspections/${updated.id}`,
            emitRealtime: true,
            type: 'info',
          },
          NotificationCategory.COMMUNICATION
        );
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            inspectionId: updated.id,
            submittedAt: updated.guestFormSubmittedAt,
            remainingCount,
          },
          'Inspection submitted for landlord review'
        )
      );
    } catch (err: any) {
      mapGuestErr(err);
    }
  });
}

export default new PublicInspectionController();
