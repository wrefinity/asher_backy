import { Response } from 'express';
import { MoveOutNoticeType, Prisma } from '@prisma/client';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import moveOutNoticeService from '../../services/moveOutNotice.service';

class MoveOutNoticeController {
  create = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized('Unauthorized');

    const tenant = await moveOutNoticeService.getCurrentTenantForUser(userId);
    if (!tenant) throw ApiError.notFound('No current tenancy found');

    const { intendedMoveOutDate, reason, comments, type, searchCriteria } = req.body as {
      intendedMoveOutDate: string;
      reason: string;
      comments?: string;
      type: MoveOutNoticeType;
      searchCriteria?: Record<string, unknown>;
    };

    if (!intendedMoveOutDate || !reason || !type) {
      throw ApiError.badRequest('intendedMoveOutDate, reason, and type are required');
    }
    if (!Object.values(MoveOutNoticeType).includes(type)) {
      throw ApiError.badRequest('type must be RELOCATING or LEAVING');
    }

    try {
      const notice = await moveOutNoticeService.createNotice({
        tenantId: tenant.id,
        intendedMoveOutDate: new Date(intendedMoveOutDate),
        reason,
        comments,
        type,
        searchCriteria: searchCriteria as Prisma.InputJsonValue | undefined,
      });

      return res.status(201).json(ApiResponse.created(notice, 'Move-out notice submitted'));
    } catch (error) {
      if (error instanceof Error && error.message === 'ACTIVE_MOVE_OUT_NOTICE_EXISTS') {
        throw ApiError.badRequest('You already have a pending move-out notice');
      }
      throw error;
    }
  });

  getCurrent = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized('Unauthorized');

    const tenant = await moveOutNoticeService.getCurrentTenantForUser(userId);
    if (!tenant) {
      return res.status(200).json(ApiResponse.success(null, 'No current tenancy'));
    }

    const notice = await moveOutNoticeService.getActiveNoticeForTenant(tenant.id);
    return res.status(200).json(ApiResponse.success(notice));
  });
}

export default new MoveOutNoticeController();
