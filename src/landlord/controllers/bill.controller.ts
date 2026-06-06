import { Response } from "express";
import errorService from "../../services/error.service";
import { CustomRequest } from "../../utils/types";
import { billSchema, billUpdateSchema, billCategorySchema } from "../validations/schema/billSchema";
import billServices, { BillQueryParams } from "../services/bill.services";
import { PayableBy } from "@prisma/client";
import { serverInstance } from "../..";

class BillController {
    constructor() { }

    createBill = async (req: CustomRequest, res: Response) => {
        const { error, value } = billSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const landlordId = req.user?.landlords?.id;
        try {
            const { notify, ...data } = value;
            const bill = await billServices.createSubBills(data, landlordId);
            if (notify && serverInstance.paymentNotificationService) {
                await serverInstance.paymentNotificationService.sendNewBillNotification(bill.id);
            }
            return res.status(201).json({ bill });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    createBillCategory = async (req: CustomRequest, res: Response) => {
        const { error, value } = billCategorySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const bill = await billServices.createBills(value);
            return res.status(201).json({ bill });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    bulkUploadBills = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(401).json({ message: 'Unauthorized - Landlord ID missing' });
        }

        const bills = Array.isArray(req.body?.bills) ? req.body.bills : [];
        if (bills.length === 0) {
            return res.status(400).json({ message: 'At least one bill record is required' });
        }

        const defaultCategoryId = await billServices.ensureDefaultBillCategory();

        const created: unknown[] = [];
        const errors: { index: number; message: string }[] = [];

        for (let index = 0; index < bills.length; index++) {
            const row = {
                ...bills[index],
                billCategoryId: bills[index]?.billCategoryId || defaultCategoryId,
            };
            const { error, value } = billSchema.validate(row);
            if (error) {
                errors.push({ index, message: error.details[0].message });
                continue;
            }
            try {
                const { notify, ...data } = value;
                const bill = await billServices.createSubBills(data, landlordId);
                created.push(bill);
            } catch (err: any) {
                errors.push({ index, message: err.message || 'Failed to create bill' });
            }
        }

        return res.status(201).json({
            success: errors.length === 0,
            createdCount: created.length,
            errorCount: errors.length,
            created,
            errors,
        });
    };

    updateBill = async (req: CustomRequest, res: Response) => {
        const { billId } = req.params;
        const { value, error } = billUpdateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const {notify, ...data} = value
            const bill = await billServices.updateBill(billId, data);
            if (notify && serverInstance.paymentNotificationService) {
                await serverInstance.paymentNotificationService.sendNewBillNotification(bill.id);
            }
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

    getBillCatalog = async (req: CustomRequest, res: Response) => {
        try {
            const market = (req.query.market as string) || 'UK';
            const { getBillCatalogForMarket } = await import('../../utils/billCatalog');
            return res.status(200).json({
                market: market.toUpperCase(),
                categories: getBillCatalogForMarket(market),
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    seedBillCatalog = async (req: CustomRequest, res: Response) => {
        try {
            const market = (req.body?.market as string) || 'UK';
            const result = await billServices.seedMarketBillCategories(market);
            return res.status(201).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    getPropertyBillTemplates = async (req: CustomRequest, res: Response) => {
        try {
            const { propertyId } = req.params;
            const billTemplateService = (await import('../../services/billTemplate.service')).default;
            const templates = await billTemplateService.getPropertyChargeTemplates(propertyId);
            return res.status(200).json({ propertyId, templates });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    createBillFromTemplate = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(401).json({ message: 'Unauthorized - Landlord ID missing' });
        }

        const { templateKey, propertyId, tenantId, amount, dueDate, notify } = req.body ?? {};
        if (!templateKey || !propertyId || !dueDate) {
            return res.status(400).json({
                message: 'templateKey, propertyId, and dueDate are required',
            });
        }

        try {
            const billTemplateService = (await import('../../services/billTemplate.service')).default;
            const bill = await billTemplateService.createBillFromTemplate(landlordId, {
                templateKey,
                propertyId,
                tenantId,
                amount,
                dueDate,
                notify,
            });

            if (notify && serverInstance.paymentNotificationService) {
                await serverInstance.paymentNotificationService.sendNewBillNotification(bill.id);
            }

            return res.status(201).json({ bill });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Failed to create bill from template' });
        }
    };
}

export default new BillController();
