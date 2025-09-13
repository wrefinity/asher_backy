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
  

    if (!tenantId) {
      throw ApiError.badRequest("Please log in as either a tenant or a landlord");
    }

     const property = await MaintenanceService.searchPropertyUnitRoomForMaintenace(value?.propertyId);
    if (!property) {
      throw ApiError.notFound("Property not found");
    }
    // // Check if the maintenance category is whitelisted by the landlord
    // const isWhitelisted = await MaintenanceService.checkWhitelist(
    //   landlordId,
    //   value.categoryId,
    //   value.subcategoryId,
    //   value.propertyId,
    // );

    // // Determine if maintenance should be handled by the landlord
    // const handleByLandlord = landlordId || isWhitelisted;

   

    // const maintenance = await MaintenanceService.createMaintenance({
    //   ...value,
    //   handleByLandlord: handleByLandlord || false,
    //   landlordDecision: handleByLandlord ? maintenanceDecisionStatus.PENDING : undefined,
    //   tenantId: tenantId || undefined
    // });
    const maintenance = await MaintenanceService.createMaintenance({
      ...value,
      handleByLandlord: false,
      landlordDecision:  undefined,
      tenantId: tenantId || undefined
    });

    // await logsServices.createLog({
    //   events: `${req.user.email} initiated a maintenance request for the property named ${property?.name}`,
    //   type: "MAINTENANCE", // Use string literal or import LogType enum
    //   // propertyId: property?.id,
    //   createdById: req.user.id,
    // });

    // if (isWhitelisted && !landlordId) {
    //   return res.status(200).json(
    //     ApiResponse.success(
    //       { maintenance },
    //       "Request created and will be handled by landlord"
    //     )
    //   );
    // }

    return res.status(201).json(
      ApiResponse.success(
        { maintenance },
        "Maintenance request created successfully"
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
}

export default new MaintenanceControls();