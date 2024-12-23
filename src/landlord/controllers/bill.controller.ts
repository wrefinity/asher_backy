import { Response } from "express";
import errorService from "../../services/error.service";
import { CustomRequest } from "../../utils/types";
import { billSchema } from "../validations/schema/billSchema";
import billServices from "../services/bill.services";

class BillController {
    constructor() { }

    createBill = async (req: CustomRequest, res: Response) =>{
        const { error, value } = billSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const landlordId = req.user?.landlords?.id;
        try {
            const bill = await billServices.createBill(value, landlordId);
            return res.status(201).json({bill});
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateBill = async (req: CustomRequest, res: Response) => {
        const { billId } = req.params;
        const { value, error } = billSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const landlordId = req.user.landlords.id;

        try {
            const bill = await billServices.updateBill(billId, value, landlordId);
            // NOTE: When we create a new bill we want to alert tenants and show on their side too
            return res.status(201).json({bill});
            
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

    //NOTE: These are the bills tenants under this landlord will pay
    getAllBills = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        try {
            const bills = await billServices.getAllBills(landlordId);
            return res.status(201).json(bills);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getSingleBill = async (req: CustomRequest, res: Response) =>{
        const { billId } = req.params;
        const landlordId = req.user?.landlords?.id;
        try {
            const bill = await billServices.getBillById(billId, landlordId);
            return res.status(201).json(bill);

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getBillByPropertyId = async (req: CustomRequest, res: Response) =>{
        const { propertyId } = req.params;
        const landlordId = req.user?.landlords?.id;
        try {
            const bill = await billServices.getBillByPropertyId(propertyId, landlordId);
            return res.status(201).json(bill);

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new BillController();
