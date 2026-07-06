import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import tenantBillsService from "../services/tenant-bills.service";
import landlordBillsService from "../../landlord/services/bill.services";
import { PayableBy } from "@prisma/client";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import tenantsServices from "../../services/tenant.service";
import { resolveTenantBillAccessScope } from "../../utils/billScope.util";

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
    const billScope = await resolveTenantBillAccessScope(tenantId);

    const {
      page = "1",
      limit = "100",
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
      billScope.includePropertyWideBills,
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
    const billScope = await resolveTenantBillAccessScope(tenantId);

    const tenantBills = await landlordBillsService.getUpcomingBillsForTenant(
      tenantId,
      billScope.propertyId,
      billScope.includePropertyWideBills,
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

    const billScope = await resolveTenantBillAccessScope(tenantId);

    const [tenantBills, analysis] = await Promise.all([
      landlordBillsService.getOverdueBillsForTenant(
        tenantId,
        billScope.propertyId,
        billScope.includePropertyWideBills
      ),
      tenantBillsService.getTenantOverdueAnalysis(tenantId),
    ]);
    return res.status(200).json(
      ApiResponse.success(
        { analysis, tenantBills: tenantBills ?? [] },
        "Overdue bills retrieved successfully"
      )
    );
  });
}

export default new TenantBillController();
