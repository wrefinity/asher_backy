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

    // get property linked to tenant
    const tenant = await tenantsServices.getTenantById(tenantId);

    const propertyId = tenant?.propertyId || req.query.propertyId || null;
    console.log("propertyId", propertyId);
    console.log("tenant", tenant);
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

    // Prepare transaction filter if status is provided
    const transactionFilter = status
      ? status === "paid"
        ? { transactions: { some: {} } } // At least one transaction exists
        : { transactions: { none: {} } } // No transactions exist
      : {};

    const result = await landlordBillsService.getBills(
      {
        // tenantId,
        propertyId: String(propertyId),
        billId,
        payableBy: payableBy as PayableBy,
        dateRange,
        ...transactionFilter,
      },
      {
        page: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
      {
        includeProperty: true,
        includeLandlord: true,
        includeTransactions: true,
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

    const { days } = req.body;

    const tenantBills = await tenantBillsService.getUpcomingBills(tenantId, days);

    if (!tenantBills || tenantBills.length < 1) {
      throw ApiError.notFound("No upcoming bills found");
    }

    return res
      .status(200)
      .json(ApiResponse.success(tenantBills, "Upcoming bills retrieved successfully"));
  });

  getOverdueBills = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const tenantBills = await tenantBillsService.getOverdueBills(tenantId);

    if (!tenantBills || tenantBills.length < 1) {
      throw ApiError.notFound("No overdue bills found");
    }
    const analysis = await tenantBillsService.getTenantOverdueAnalysis(tenantId);
    return res
      .status(200)
      .json(ApiResponse.success({ analysis, tenantBills}, "Overdue bills retrieved successfully"));
  });
}

export default new TenantBillController();