import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import MaintenanceService from "../../services/maintenance.service";
import PropertyService from "../../services/propertyServices";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";

class MaintenanceControls {
  getMaintenances = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;

    if (!tenantId) {
      throw ApiError.validationError("Kindly log in as a tenant");
    }

    const property = await PropertyService.getPropertiesAttachedToTenants(tenantId);
    if (!property) {
      throw ApiError.notFound("No property attached to this tenant");
    }

    const maintenances = await MaintenanceService.getPropertyTenantMaintenance(
      property.id,
      tenantId
    );

    return res
      .status(200)
      .json(ApiResponse.success(maintenances, "Tenant maintenance records retrieved successfully"));
  });
}

export default new MaintenanceControls();
