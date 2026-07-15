import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import ViolationResponseService from "../../services/violations";
import { notifyUser } from "../../services/notify";
class ViolationController {
  constructor() { }

  // Get tenant financial dashboard overview
  createViolationResponse = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const data = req.body;

    const evidenceUrl = req.body.cloudinaryUrls[0];
    delete data["cloudinaryUrls"];
    delete data["cloudinaryVideoUrls"];
    delete data["cloudinaryDocumentUrls"];
    delete data["cloudinaryAudioUrls"];
    const created = await ViolationResponseService.createViolationResponse({
      ...data,
      evidenceUrl,
      tenantId: tenantId!
    });

    try {
      const landlordUserId = created.violation?.createdById;
      if (landlordUserId && landlordUserId !== req.user?.id) {
        await notifyUser({
          userId: landlordUserId,
          sourceId: req.user?.id,
          type: 'violation_response',
          title: 'Violation Response',
          message: `A tenant responded to a violation notice (${created.responseType}).`,
          route: `/tenants`,
        });
      }
    } catch (notifyErr) {
      console.warn('Non-critical: violation response notify failed', notifyErr);
    }

    return res.status(201).json(
      ApiResponse.success({ data: created })
    );

  })
  getByTenant = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const result = await ViolationResponseService.getViolationTenantId(tenantId!);
    const statistics = ViolationResponseService.buildTenantViolationDashboard(result);
    return res.status(200).json(
      ApiResponse.success({ result, statistics })
    );
  })
  getTenantViolationResponses = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const result = await ViolationResponseService.getViolationResponseByTenantId(tenantId!);
    return res.status(200).json(
      ApiResponse.success({ data: result })
    );
  })
  getViolationById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json(ApiError.badRequest("Violation Response ID is required"));
    }
    const result = await ViolationResponseService.getViolationById(id!);
    return res.status(200).json(
      ApiResponse.success({ data: result })
    );
  })

  getViolationResponsesById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { violationId } = req.params;
    if (!violationId) {
      return res.status(400).json(ApiError.badRequest("Violation ID is required"));
    }
    const result = await ViolationResponseService.getResponseByViolationId(violationId!);
    return res.status(200).json(
      ApiResponse.success({ data: result })
    );
  })
}

export default new ViolationController();
