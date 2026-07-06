import { Response } from "express";
import { maintenanceStatus } from "@prisma/client";
import { CustomRequest } from "../../utils/types";
import MaintenanceService from "../../services/maintenance.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import propertyServices from "../../services/propertyServices";
import logsServices from "../../services/logs.services";
import { LogType } from ".prisma/client";
import { maintenanceDecisionStatus} from '@prisma/client';
import tenantsServices from "../services/tenants.services";
import tenantService from "../../services/tenant.service";
import maintenanceService from "../../services/maintenance.service";
class MaintenanceControls {

 public createMaintenance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const value = req.body;
    const tenantId = req.user.tenant?.id;
    const landlordId = req.user.tenant?.landlordId;

    if (!tenantId) {
      throw ApiError.badRequest("Please log in as either a tenant or a landlord");
    }

    const property = await MaintenanceService.searchPropertyUnitRoomForMaintenace(value?.propertyId);
    if (!property) {
      throw ApiError.notFound("Property not found");
    }

    const subcategoryId =
      value.subcategoryIds?.[0] ?? value.subcategoryId ?? undefined;

    const isWhitelisted = landlordId
      ? !!(await MaintenanceService.checkWhitelist(
          landlordId,
          value.categoryId,
          subcategoryId,
          value.propertyId
        ))
      : false;

    const requiresLandlordApproval = !isWhitelisted;

    const maintenance = await MaintenanceService.createMaintenance({
      ...value,
      landlordId: landlordId || undefined,
      handleByLandlord: requiresLandlordApproval,
      landlordDecision: requiresLandlordApproval
        ? maintenanceDecisionStatus.PENDING
        : undefined,
      tenantId,
    });

    return res.status(201).json(
      ApiResponse.success(
        { maintenance, requiresLandlordApproval, isWhitelisted },
        requiresLandlordApproval
          ? "Maintenance request created and is pending landlord approval"
          : "Maintenance request created successfully"
      )
    );
  });

  getMaintenances = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    console.log(req.user)

    if (!tenantId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const maintenances = await MaintenanceService.getPropertyTenantMaintenance(tenantId);

    if (!maintenances || maintenances.length === 0) {
      throw ApiError.notFound("No maintenance records found for this tenant");
    }

    return res
      .status(200)
      .json(ApiResponse.success(maintenances, "Tenant maintenance records retrieved successfully"));
  });

    getMaintenancesById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const maintenanceId = req.params.id;
    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);

    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }
    if (maintenance.tenantId !== tenantId) {
      throw ApiError.forbidden("You do not have access to this maintenance request");
    }

    return res
      .status(200)
      .json(ApiResponse.success(maintenance, "Tenant maintenance record retrieved successfully"));
  });

  verifyMaintenanceCompletion = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const maintenanceId = req.params.id;
    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }
    if (maintenance.tenantId !== tenantId) {
      throw ApiError.forbidden("You do not have access to this maintenance request");
    }
    if (maintenance.status !== maintenanceStatus.COMPLETED) {
      throw ApiError.badRequest(
        "Maintenance must be marked complete before you can verify it"
      );
    }

    if (maintenance.tenantVerified) {
      return res.status(200).json(
        ApiResponse.success(maintenance, "Maintenance completion already verified")
      );
    }

    const verified = await MaintenanceService.verifyTenantCompletion(
      maintenanceId,
      tenantId
    );

    return res.status(200).json(
      ApiResponse.success(verified, "Maintenance completion verified successfully")
    );
  });

  postMaintenanceComment = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const maintenanceId = req.params.id;
    const { comment } = req.body as { comment?: string };
    if (!comment || typeof comment !== "string" || !comment.trim()) {
      throw ApiError.badRequest("Comment is required");
    }

    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }
    if (maintenance.tenantId !== tenantId) {
      throw ApiError.forbidden("You do not have access to this maintenance request");
    }

    const note = await MaintenanceService.addNote(
      maintenanceId,
      userId,
      comment.trim()
    );

    return res.status(201).json(
      ApiResponse.success(note, "Comment added successfully")
    );
  });
}

export default new MaintenanceControls();