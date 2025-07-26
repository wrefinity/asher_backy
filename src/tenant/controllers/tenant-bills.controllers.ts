import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import tenantBillsService from "../services/tenant-bills.service";
import landlordBIllsService from "../../landlord/services/bill.services"
import { PayableBy } from "@prisma/client";
interface TenantBillQueryParams {
    page?: string;
    limit?: string;
    propertyId?: string;
    billId?: string;
    payableBy?: PayableBy;
    status?: 'paid' | 'unpaid';
    startDate?: string;
    endDate?: string;
}
class TenantBillController {
    constructor() {
    }

    getTenantBill = async (req: CustomRequest, res: Response) => {
        const tenantId = req.user?.tenant?.id;
        if (!tenantId) {
            return res.status(401).json({ message: 'Unauthorized - Tenant ID missing' });
        }

        const {
            page = '1',
            limit = '10',
            propertyId,
            billId,
            payableBy,
            status,
            startDate,
            endDate
        } = req.query as TenantBillQueryParams;

        try {
            // Prepare date range if provided
            const dateRange = startDate || endDate ? {
                start: startDate ? new Date(startDate) : undefined,
                end: endDate ? new Date(endDate) : undefined
            } : undefined;

            // Prepare transaction filter if status is provided
            const transactionFilter = status ? {
                transactions: status === 'paid' ?
                    { some: {} } : // At least one transaction exists
                    { none: {} }  // No transactions exist
            } : {};

            const result = await landlordBIllsService.getBills(
                {
                    tenantId,
                    propertyId,
                    billId,
                    payableBy: payableBy as PayableBy,
                    dateRange,
                    ...transactionFilter
                },
                {
                    page: parseInt(page, 10),
                    pageSize: parseInt(limit, 10)
                },
                {
                    includeProperty: true,
                    includeLandlord: true,
                    includeTransactions: true
                }
            );

            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getUpcomingBills(req: CustomRequest, res: Response) {
        const tenantId = req.user?.tenant?.id;
        const { days } = req.body

        try {
            const tenantBills = await tenantBillsService.getUpcomingBills(tenantId, days);
            if (!tenantBills || tenantBills.length < 1) return res.status(404).json({ message: "No bills found" });
            return res.status(200).json(tenantBills);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getOverdueBills(req: CustomRequest, res: Response) {
        const tenantId = req.user?.tenant?.id;

        try {
            const tenantBills = await tenantBillsService.getOverdueBills(tenantId);
            if (!tenantBills || tenantBills.length < 1) return res.status(404).json({ message: "No bills found" });
            return res.status(200).json(tenantBills);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TenantBillController();