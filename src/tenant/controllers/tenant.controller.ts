import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import TenantService from "../services/tenants.services";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";

class TenantController {
  constructor() {}

  getTenantById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { tenantId } = req.params;

    if (!tenantId) {
      throw ApiError.badRequest("Tenant ID is required");
    }

    const tenant = await TenantService.getTenantWithUserAndProfile(tenantId);

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(tenant, "Tenant retrieved successfully"));
  });
}

export default new TenantController();
