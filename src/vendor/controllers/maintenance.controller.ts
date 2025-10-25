import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import MaintenanceService from "../../services/maintenance.service";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import ServiceServices from "../services/vendor.services";
import { maintenanceStatus, TransactionStatus, vendorAvailability } from '@prisma/client';
class MaintenanceController {
  // Get all maintenances
  getMaintenances = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user.vendors.id;
    // Explicitly extract and convert pagination values safely
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const maintenances = await MaintenanceService.getSpecificVendorMaintenanceRequest(vendorId, {
      page, limit
    });
    return res
      .status(200)
      .json(ApiResponse.paginated(maintenances.data,
        maintenances.meta,
        "All maintenance records retrieved successfully"
      ));
  });

  // this function is for vendor to update payment to completed
  updateMaintenanceToCompleted = asyncHandler(async (req: CustomRequest, res: Response) => {

    const maintenanceId = req.params.maintenanceId;
    const vendorId = req.user?.vendors?.id;
    const maintenanceExits = await MaintenanceService.getMaintenanceById(maintenanceId);
    if (!maintenanceExits) {
      return res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
    }

    //check if payment has beeen completed
    if (maintenanceExits.paymentStatus !== TransactionStatus.COMPLETED) {
      return res.status(400).json({ message: `Payment has not been completed yet` });
    }

    const maintenance = await MaintenanceService.updateStatus(maintenanceId, maintenanceStatus.COMPLETED, vendorId);

    // decrement job current count for vendor
    await ServiceServices.decrementJobCount(maintenance.serviceId, vendorId);

    return res.status(201).json(
      ApiResponse.success(
        maintenance,
        `maintenance status updated: ${maintenanceStatus.COMPLETED}`
      )
    );
  });

  getMaintenancesByStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vendorId = req.user?.vendors?.id;
    const { status } = req.query;

    if (!vendorId) {
      return res.status(400).json(ApiError.badRequest('Vendor not found for this user'));
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json(ApiError.badRequest('Status query parameter is required'));
    }

    // Explicitly extract and convert pagination values safely
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const maintenances = await MaintenanceService.getVendorsMaintenanceStates(
      vendorId,
      status as maintenanceStatus,
      limit,
      page
    );

    const formattedStatus =
      status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    return res.status(200).json(
      ApiResponse.paginated(
        maintenances.data,
        maintenances.meta,
        `Maintenance records with status ${formattedStatus} retrieved successfully`
      )
    );
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
    const vendorId = req.user?.vendors?.id;

    if (!newStatus) {
      return res.status(400).json(ApiError.badRequest("New status is required"));
    }

    const updated = await MaintenanceService.updateStatus(maintenanceId, newStatus, vendorId);
    return res
      .status(200)
      .json(ApiResponse.success(updated, `Maintenance status updated to ${newStatus}`));
  });

  acceptJob = asyncHandler(async (req: CustomRequest, res: Response) => {

    const maintenanceId = req.params.maintenanceId;
    const vendorId = req.user.vendors.id;

    const maintenanceRequest = await MaintenanceService.getMaintenanceById(maintenanceId);
    if (!maintenanceRequest) {
      res.status(404).json(
        ApiError.notFound("maintenance request not found")
      );
    }

    // before assigning make sure its unassigned
    if (maintenanceRequest.status !== maintenanceStatus.UNASSIGNED) {
      return res.status(400).json(
        ApiError.badRequest("job already assigned to a vendor")
      );
    }

    const vendorService = await ServiceServices.getSpecificVendorService(vendorId, maintenanceRequest.categoryId);
    if (!vendorService) {
      return res.status(400).json(
        {
          message: "Vendor didnt subscribe to this service category"
        }
      )
    }
    // Check vendor availability and current job load
    if (vendorService.availability === vendorAvailability.NO) {
      return res.status(400).json({ message: 'Vendor is not available' });
    }
    if (vendorService && vendorService.currentJobs > 2) {
      return res.status(400).json({ message: "job level exceeded" });
    }

    const updated = await MaintenanceService.assignMaintenance(
      maintenanceId,
      {
        vendorId,
        status: maintenanceStatus.ASSIGNED,
        serviceId: vendorService.id
      },
      maintenanceRequest.status,
    );
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Job successfully accepted by vendor"));

  })

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
    const vendorId = req.user?.vendors?.id;
    if (!resumeDate) {
      throw ApiError.badRequest("Resume date is required");
    }

    const updated = await MaintenanceService.pauseMaintenance(maintenanceId, resumeDate, vendorId);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Work paused successfully"));
  });

  // Resume maintenance
  resumeMaintenance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const vendorId = req.user?.vendors?.id;
    const updated = await MaintenanceService.resumeMaintenance(maintenanceId, vendorId);
    return res
      .status(200)
      .json(ApiResponse.success(updated, "Work resumed successfully"));
  });

  confirmCancellationByVendor = asyncHandler(async (req: CustomRequest, res: Response) => {
    const maintenanceId = req.params.maintenanceId;
    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);

    const vendorId = req.user.vendors?.id;
    // Ensure the vendor providing consent is the assigned vendor
    if (maintenance.vendorId !== vendorId) {
      throw new Error("Unauthorized: Only the assigned vendor can consent to cancellation.");
    }
    // Update the maintenance record to reflect vendor consent
    const updated = await MaintenanceService.updateMaintenance(
      maintenanceId,
      {
        vendorConsentCancellation: true,
        status: maintenanceStatus.CANCEL,
      }
    );
    return res.status(200).json(
      ApiResponse.success(
        updated,
        "Vendor has confirmed maintenance cancellation"
      )
    );
  })
}

export default new MaintenanceController();
