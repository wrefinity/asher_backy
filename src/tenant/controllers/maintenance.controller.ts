import { Response } from "express";
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
    const maintenanceId = req.params.id;
    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);

    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(maintenance, "Tenant maintenance record retrieved successfully"));
  });
}

export default new MaintenanceControls();