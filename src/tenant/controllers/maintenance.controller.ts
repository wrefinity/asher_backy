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
import { submitPriceOfferSchema } from "../../validations/schemas/maintenance.schema";
import reviewService from "../../services/review.service";
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
      // Whitelisted (tenant self-service) requests are postable immediately.
      // Landlord-liable ones stay hidden from vendors until the landlord
      // posts them (repair-myself) or the tenant sets a price after their
      // offer is accepted.
      postedForVendorSearch: !requiresLandlordApproval,
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

    const timeSpentSeconds = await MaintenanceService.getJobTimeSpentSeconds(maintenanceId);

    return res
      .status(200)
      .json(ApiResponse.success({ ...maintenance, timeSpentSeconds }, "Tenant maintenance record retrieved successfully"));
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

  resolveReschedule = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const { approve } = req.body as { approve?: boolean };
    if (typeof approve !== "boolean") {
      throw ApiError.badRequest("approve (true/false) is required");
    }

    const maintenanceId = req.params.id;
    const updated = await MaintenanceService.resolveRescheduleRequest(maintenanceId, tenantId, approve);

    return res.status(200).json(
      ApiResponse.success(updated, approve ? "Reschedule approved" : "Reschedule declined")
    );
  });

  submitPriceOffer = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const { error, value } = submitPriceOfferSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest(error.details[0].message);
    }

    const maintenanceId = req.params.id;
    const maintenance = await MaintenanceService.getMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }
    if (maintenance.tenantId !== tenantId) {
      throw ApiError.forbidden("You do not have access to this maintenance request");
    }
    if (!maintenance.handleByLandlord || !maintenance.tenantWantsToPay) {
      throw ApiError.badRequest("This request does not require a price offer");
    }
    if (maintenance.landlordDecision !== maintenanceDecisionStatus.APPROVED) {
      throw ApiError.badRequest(
        "Your landlord needs to approve your offer before you can set a price"
      );
    }
    // The landlord may have approved to repair it themselves instead of
    // accepting the tenant's offer - in that case pricing was never unlocked.
    if (maintenance.landlordWillRepair) {
      throw ApiError.badRequest(
        "Your landlord chose to handle this repair themselves"
      );
    }
    if (maintenance.amount) {
      throw ApiError.badRequest("A price offer has already been submitted for this request");
    }

    // Setting a price is the tenant's final step - the job is now ready for
    // vendor search, same as a whitelisted request would be immediately.
    const updated = await MaintenanceService.updateMaintenance(maintenanceId, {
      amount: value.amount,
      selectedPackage: value.selectedPackage,
      postedForVendorSearch: true,
    });

    return res.status(200).json(
      ApiResponse.success(updated, "Price offer submitted successfully")
    );
  });

  rateVendor = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Kindly log in as a tenant");
    }

    const { rating, comment } = req.body as { rating?: number; comment?: string };
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      throw ApiError.badRequest("A rating between 1 and 5 is required");
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
      throw ApiError.badRequest("You can only rate a vendor after the job is completed");
    }
    if (!maintenance.vendorId) {
      throw ApiError.badRequest("No vendor is assigned to this job");
    }

    const existing = await reviewService.getReviewByMaintenanceId(maintenanceId);
    if (existing) {
      throw ApiError.badRequest("You have already rated this job");
    }

    const review = await reviewService.createReview({
      rating,
      comment,
      vendorId: maintenance.vendorId,
      tenantId,
      propertyId: maintenance.propertyId || undefined,
      maintenanceId,
      reviewById: userId,
    });

    return res.status(201).json(
      ApiResponse.success(review, "Vendor rated successfully")
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