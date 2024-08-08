import { Response } from "express";
import errorService from "../services/error.service";
import paystackServices from "../services/paystack.services";
import transactionServices from "../services/transaction.services";
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
            res.status(201).json(authorizationUrl)

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async verifyPayment(req: CustomRequest, res: Response) {
        const { referenceId } = req.params
        if (!referenceId) return res.status(404).json({ message: 'No refrenceId provided' })
        const userId = String(req.user.id)
        try {
            const verificationResult = await paystackServices.verifyPayment(referenceId);
            if (verificationResult.status) {
                await transactionServices.updateReferneceTransaction(referenceId, userId)
                return res.status(200).json({
                    message: "Payment successful",
                    transaction: verificationResult.data,
                });
            } else {
                return res.status(400).json({
                    message: "Payment Failed",
                    transaction: verificationResult.data,
                });
            }
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TransactionController();