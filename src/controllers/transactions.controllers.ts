import { Response } from "express";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";
import { CustomRequest } from "../utils/types";
import transactionScheam from "../validations/schemas/transaction.scheam";

class TransactionController {
    async fundWallet(req: CustomRequest, res: Response) {
        const userId = String(req.user.id);
        const { value, error } = transactionScheam.create().validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }

        try {
            const amount = Number(value.amount);
            const authorizationUrl = await walletService.fundWallet(userId, amount)
            res.status(201).json({ "authorization_url": authorizationUrl })

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TransactionController();