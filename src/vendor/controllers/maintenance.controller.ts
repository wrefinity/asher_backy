import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import MaintenanceService from "../../services/maintenance.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";


class MaintenanceControls {


  getMaintenances = asyncHandler(async (req: CustomRequest, res: Response) => {

    const maintenances = await MaintenanceService.getAllMaintenances();
    return res
      .status(200)
      .json(ApiResponse.success(maintenances));
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