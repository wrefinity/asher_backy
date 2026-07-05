import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import relocationService, { PREMIUM_RELOCATE_MIN_DISPLAY_SCORE } from '../../services/relocation.service';
import moveOutNoticeService from '../../services/moveOutNotice.service';
import PerformanceCalculator from '../../services/PerformanceCalculator';
import { PropertySearchDto } from '../../validations/interfaces/properties.interface';

class RelocationController {
  postInterest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized('Unauthorized');

    const tenant = await moveOutNoticeService.getCurrentTenantForUser(userId);
    if (!tenant) throw ApiError.notFound('No current tenancy found');

    const { criteria, intendedMoveOutDate, reason, comments } = req.body as {
      criteria: PropertySearchDto & Record<string, unknown>;
      intendedMoveOutDate: string;
      reason?: string;
      comments?: string;
    };

    if (!criteria || !intendedMoveOutDate) {
      throw ApiError.badRequest('criteria and intendedMoveOutDate are required');
    }

    try {
      const result = await relocationService.postInterest({
        tenantId: tenant.id,
        userId,
        criteria,
        intendedMoveOutDate: new Date(intendedMoveOutDate),
        reason,
        comments,
      });

      return res.status(201).json(
        ApiResponse.created(result, `Interest posted — ${result.matchCount} landlord(s) matched`)
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INSUFFICIENT_SCORE') {
          throw ApiError.forbidden(
            `Premium relocation requires an Asher score of at least ${PREMIUM_RELOCATE_MIN_DISPLAY_SCORE}. Use search and apply instead.`
          );
        }
        if (error.message === 'ACTIVE_LEAVING_NOTICE') {
          throw ApiError.badRequest('You have an active move-out notice for leaving completely');
        }
        if (error.message === 'TENANT_NOT_FOUND') {
          throw ApiError.notFound('No current tenancy found');
        }
        if (error.message === 'ACTIVE_MOVE_OUT_NOTICE_EXISTS') {
          throw ApiError.badRequest('You already have a pending move-out notice');
        }
      }
      throw error;
    }
  });

  getInterest = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized('Unauthorized');

    const tenant = await moveOutNoticeService.getCurrentTenantForUser(userId);
    if (!tenant) {
      return res.status(200).json(ApiResponse.success(null));
    }

    const interest = await relocationService.getActiveInterest(tenant.id);
    return res.status(200).json(ApiResponse.success(interest));
  });

  getEligibility = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized('Unauthorized');

    const performance = await PerformanceCalculator.calculateOverallScore(userId);
    const displayScore = relocationService.getDisplayScore(performance.overallScore);

    return res.status(200).json(
      ApiResponse.success({
        displayScore,
        overallScore: performance.overallScore,
        premiumEligible: displayScore >= PREMIUM_RELOCATE_MIN_DISPLAY_SCORE,
        minDisplayScore: PREMIUM_RELOCATE_MIN_DISPLAY_SCORE,
      })
    );
  });
}

export default new RelocationController();
