import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import MaintenanceService from "../../services/maintenance.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";

class MaintenanceControls {
  // Get all maintenances
  getMaintenances = asyncHandler(async (req: CustomRequest, res: Response) => {
    const maintenances = await MaintenanceService.getAllMaintenances();
    return res
      .status(200)
      .json(ApiResponse.success(maintenances, "All maintenance records retrieved successfully"));
  });

  // Get maintenance by ID
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

  // Upload start attachments
  uploadStartAttachments = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const files = req.body.uploadedFiles; // assume [{ url, type }]

    if (!files || !Array.isArray(files)) {
      throw ApiError.badRequest("Files are required and must be an array");
    }

    const updated = await MaintenanceService.uploadStartAttachments(maintenanceId, files);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Start attachments uploaded successfully"));
  });

  // Upload end attachments
  uploadEndAttachments = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const files = req.body.uploadedFiles; 

    if (!files || !Array.isArray(files)) {
      throw ApiError.badRequest("Files are required and must be an array");
    }

    const updated = await MaintenanceService.uploadEndAttachments(maintenanceId, files);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "End attachments uploaded successfully"));
  });

  // Change status (pause, resume, complete, etc.)
  updateStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const { newStatus } = req.body;

    if (!newStatus) {
      throw ApiError.badRequest("New status is required");
    }

    const updated = await MaintenanceService.updateStatus(maintenanceId, newStatus);
    return res
      .status(200)
      .json(ApiResponse.success(updated, `Maintenance status updated to ${newStatus}`));
  });

  // Vendor accepts job
  acceptJob = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const vendorId = req.user.vendors.id;

    if (!vendorId) {
      throw ApiError.badRequest("Vendor ID is required to accept a job");
    }

    const updated = await MaintenanceService.assignVendor(maintenanceId, vendorId);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Job successfully accepted by vendor"));
  });

  // Get status history
  getStatusHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const history = await MaintenanceService.getStatusHistory(maintenanceId);

    if (!history || history.length === 0) {
      throw ApiError.notFound("No status history found for this maintenance record");
    }

    return res
      .status(200)
      .json(ApiResponse.success(history, "Maintenance status history retrieved successfully"));
  });

   // Reschedule maintenance
  rescheduleMaintenance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const { newDate } = req.body;

    if (!newDate) {
      throw ApiError.badRequest("New date is required");
    }

    const updated = await MaintenanceService.rescheduleMaintenanceDate(maintenanceId, newDate);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Reschedule request sent successfully"));
  });

  // Pause maintenance
  pauseMaintenance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const { resumeDate } = req.body;

    if (!resumeDate) {
      throw ApiError.badRequest("Resume date is required");
    }

    const updated = await MaintenanceService.pauseMaintenance(maintenanceId, resumeDate);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Work paused successfully"));
  });

  // Resume maintenance
  resumeMaintenance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;

    const updated = await MaintenanceService.resumeMaintenance(maintenanceId);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Work resumed successfully"));
  });
}

export default new MaintenanceControls();
