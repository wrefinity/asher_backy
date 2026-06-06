import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import tenantBillsService from "../services/tenant-bills.service";
import landlordBillsService from "../../landlord/services/bill.services";
import { PayableBy } from "@prisma/client";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import tenantsServices from "../../services/tenant.service";

interface TenantBillQueryParams {
  page?: string;
  limit?: string;
  propertyId?: string;
  billId?: string;
  payableBy?: PayableBy;
  status?: "paid" | "unpaid";
  startDate?: string;
  endDate?: string;
}

class TenantBillController {
  constructor() {}

  getTenantBill = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const tenant = await tenantsServices.getTenantById(tenantId);
    const propertyId = tenant?.propertyId || (req.query.propertyId as string) || null;
    const landlordId = tenant?.landlordId || null;

    const {
      page = "1",
      limit = "10",
      billId,
      payableBy,
      status,
      startDate,
      endDate,
    } = req.query as TenantBillQueryParams;

    // Prepare date range if provided
    const dateRange =
      startDate || endDate
        ? {
            start: startDate ? new Date(startDate) : undefined,
            end: endDate ? new Date(endDate) : undefined,
          }
        : undefined;

    const result = await landlordBillsService.getBillsForTenant(
      tenantId,
      propertyId ? String(propertyId) : null,
      landlordId ? String(landlordId) : null,
      {
        pagination: {
          page: parseInt(page, 10),
          pageSize: parseInt(limit, 10),
        },
        includeOptions: {
          includeProperty: true,
          includeTransactions: true,
          includeBillCategory: true,
        },
        payableBy: (payableBy as PayableBy) || PayableBy.TENANT,
        status,
        dateRange,
        billId: billId as string | undefined,
      }
    );

    return res
      .status(200)
      .json(ApiResponse.success(result, "Tenant bills retrieved successfully"));
  });

  getUpcomingBills = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const days = req.query.days ? Number(req.query.days) : 30;
    const tenant = await tenantsServices.getTenantById(tenantId);
    const propertyId = tenant?.propertyId || (req.query.propertyId as string) || null;
    const landlordId = tenant?.landlordId || null;

    const tenantBills = await landlordBillsService.getUpcomingBillsForTenant(
      tenantId,
      propertyId ? String(propertyId) : null,
      landlordId ? String(landlordId) : null,
      days
    );

    return res.status(200).json(
      ApiResponse.success(tenantBills ?? [], "Upcoming bills retrieved successfully")
    );
  });

  getOverdueBills = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const tenant = await tenantsServices.getTenantById(tenantId);
    const propertyId = tenant?.propertyId || (req.query.propertyId as string) || null;
    const landlordId = tenant?.landlordId || null;

    const tenantBills = await landlordBillsService.getOverdueBillsForTenant(
      tenantId,
      propertyId ? String(propertyId) : null,
      landlordId ? String(landlordId) : null
    );
    const analysis = await tenantBillsService.getTenantOverdueAnalysis(tenantId);
    return res.status(200).json(
      ApiResponse.success(
        { analysis, tenantBills: tenantBills ?? [] },
        "Overdue bills retrieved successfully"
      )
    );
  });
}

export default new TenantBillController();