import { Response } from "express";
import { CustomRequest } from "../utils/types";
import TransactionSchema from "../validations/schemas/transaction.scheam";
import errorService from "../services/error.service";
import transferServices from "../services/transfer.services";
import { getCurrentCountryCurrency } from "../utils/helpers";
class TransferController {
    async makePayment(req: CustomRequest, res: Response) {
        const tenantId = req.user.id;
        const { value, error } = TransactionSchema.makePayment().validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            const payment = await transferServices.payBill(value, tenantId, value.currency)
            res.status(200).json(payment);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async transferFunds(req: CustomRequest, res: Response) {
        const userId = (req.user.id);
        const { value, error } = TransactionSchema.trasferFunds().validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        try {
            const {locationCurrency} = await getCurrentCountryCurrency();
            const transfer = await transferServices.transferFunds(userId, value, locationCurrency)
            res.status(200).json(transfer);
        } catch (error) {       
            errorService.handleError(error, res);
        }
    }
}

export default new TransferController();