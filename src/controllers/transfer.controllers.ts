import { Response } from "express";
import { CustomRequest } from "../utils/types";
import TransactionSchema from "../validations/schemas/transaction.scheam";
import errorService from "../services/error.service";
import transferServices from "../services/transfer.services";

class TransferController {
    async makePayment(req: CustomRequest, res: Response) {
        const tenantId = req.user.id;
        const { value, error } = TransactionSchema.makePayment().validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            const payment = await transferServices.payBill(value, tenantId)
            res.status(200).json(payment);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new TransferController();