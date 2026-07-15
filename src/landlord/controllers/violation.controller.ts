import { Response } from 'express';
import ViolationService from '../../services/violations';

import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { notifyUser } from '../../services/notify';

class ViolationController {


  createViolation = asyncHandler(async (req: CustomRequest, res: Response) => {

    const {
      description,
      severityLevel,
      actionTaken,
      tenantId,
      noticeType,
      deliveryMethod,
      propertyId,
      unitId,
      dueDate,
    } = req.body;

    if (!description || !tenantId) {
      throw ApiError.badRequest("Description and tenantId are required");
    }

    const createdById = req.user?.id || req.body.createdById;
    if (!createdById) throw ApiError.badRequest("CreatedBy ID is required");

    const violation = await ViolationService.create({
      description,
      severityLevel,
      actionTaken,
      tenantId,
      noticeType,
      deliveryMethod,
      propertyId,
      unitId,
      createdById,
      dueDate,
    });

    try {
      const { prismaClient } = await import('../..');
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        select: { userId: true },
      });
      if (tenant?.userId) {
        const severity = violation.severityLevel || 'LOW';
        await notifyUser({
          userId: tenant.userId,
          sourceId: createdById,
          type: 'violation_created',
          title: 'Violation Notice',
          message: `You have received a ${severity} severity notice: ${description.slice(0, 140)}`,
          route: '/profile/Notices',
        });
      }
    } catch (notifyErr) {
      console.warn('Non-critical: violation create notify failed', notifyErr);
    }

    return res.status(201).json(
      ApiResponse.success(violation, "Violation created successfully")
    );

  })
  deleteViolation = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json(ApiError.badRequest("Violation ID is required"));

    const violation = await ViolationService.deleteViolation(id);

    if (!violation) {
      return res.status(404).json(ApiError.notFound("Violation not found"));
    }
    return res.status(200).json(
      ApiResponse.success(violation, "Violation deleted successfully")
    );

  })
  getTenantViolation = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id

    if (!id) return res.status(400).json(ApiError.badRequest("Violation ID is required"));

    const violation = await ViolationService.getLandlordTenantViolation(userId);

    if (!violation) {
      return res.status(404).json(ApiError.notFound("Violation not found"));
    }
    return res.status(200).json(
      ApiResponse.success(violation, "Violation deleted successfully")
    );

  })
  getViolationById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json(ApiError.badRequest("Violation Response ID is required"));
    }
    const result = await ViolationService.getViolationById(id!);
    return res.status(200).json(
      ApiResponse.success({ data: result })
    );
  })

}

export default new ViolationController()