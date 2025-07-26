import { Response } from "express";
import errorService from "../../services/error.service";
import { CustomRequest } from "../../utils/types";
import { billSchema, billUpdateSchema, billCategorySchema } from "../validations/schema/billSchema";
import billServices, { BillQueryParams } from "../services/bill.services";
import { PayableBy } from "@prisma/client";

class BillController {
    constructor() { }

    createBill = async (req: CustomRequest, res: Response) => {
        const { error, value } = billSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const landlordId = req.user?.landlords?.id;
        try {
            const bill = await billServices.createSubBills(value, landlordId);
            return res.status(201).json({ bill });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    createBillCategory = async (req: CustomRequest, res: Response) => {
        const { error, value } = billCategorySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const bill = await billServices.createBills(value);
            return res.status(201).json({ bill });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateBill = async (req: CustomRequest, res: Response) => {
        const { billId } = req.params;
        const { value, error } = billUpdateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const bill = await billServices.updateBill(billId, value);
            // NOTE: When we create a new bill we want to alert tenants and show on their side too
            return res.status(201).json({ bill });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    deleteBill = async (req: CustomRequest, res: Response) => {
        const { billId } = req.params;
        const landlordId = req.user?.landlords?.id;
        try {
            const bill = await billServices.deleteBill(billId, landlordId);
            return res.status(201).json({ message: `Deleted Bill ${bill.billName} succesfully` });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getAllBills = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(401).json({ message: 'Unauthorized - Landlord ID missing' });
        }
        const {
            page = '1',
            limit = '10',
            propertyId,
            billId,
            billCategoryId,
            payableBy,
            search,
            startDate,
            endDate
        } = req.query as BillQueryParams;

        try {
            // Prepare date range if provided
            const dateRange = startDate || endDate ? {
                start: startDate ? new Date(startDate) : undefined,
                end: endDate ? new Date(endDate) : undefined
            } : undefined;

            const result = await billServices.getBills(
                {
                    landlordId,
                    propertyId,
                    billId,
                    billCategoryId,
                    payableBy: payableBy as PayableBy,
                    search,
                    dateRange
                },
                {
                    page: parseInt(page, 10),
                    pageSize: parseInt(limit, 10)
                },
                {
                    includeTenant: true,
                    includeProperty: true,
                    includeBillCategory: true
                }
            );

            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getSingleBill = async (req: CustomRequest, res: Response) => {
        const { billId } = req.params;
        try {
            const bill = await billServices.getBillById(billId);
            return res.status(201).json(bill);

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getBillsCategories = async (req: CustomRequest, res: Response) => {
        
        try {
            const bill = await billServices.getBillsCategories();
            return res.status(200).json(bill);

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

  
}

export default new BillController();
