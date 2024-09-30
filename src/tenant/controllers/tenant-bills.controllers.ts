import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import tenantBillsService from "../services/tenant-bills.service";

class TenantBillController {
    constructor() {
    }

    async getTenantBill(req: CustomRequest, res: Response) {
        const tenantId = req.user?.tenants?.id;

        try {
            const tenantBills = await tenantBillsService.getTenantBills(tenantId);
            if (!tenantBills || tenantBills.length < 1) return res.status(404).json({ message: "No bills found" });
            return res.status(200).json(tenantBills);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getUpcomingBills(req: CustomRequest, res: Response) {
        const tenantId = req.user?.tenants?.id;
        const {days} = req.body

        try {
            const tenantBills = await tenantBillsService.getUpcomingBills(tenantId, days);
            if (!tenantBills || tenantBills.length < 1) return res.status(404).json({ message: "No bills found" });
            return res.status(200).json(tenantBills);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getOverdueBills(req: CustomRequest, res: Response) {
        const tenantId = req.user?.tenants?.id;

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