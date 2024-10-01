import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";
import { getCountryCodeFromIp } from "../utils/helpers";
import { PaymentGateway } from '@prisma/client';

class WalletController {
    async getUserWallet(req: CustomRequest, res: Response) {
        const userId = String(req.user.id)

        try {
            const userWallet = await walletService.getOrCreateWallet(userId)
            res.status(200).json(userWallet)

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async fundWallet(req: CustomRequest, res: Response) {
        const userId = String(req.user.id)
        const { amount, paymentGateway } = req.body
        if (!Object.values(PaymentGateway).includes(paymentGateway)) {
            return res.status(400).json({ message: 'Invalid payment gateway' });
        }
        const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const countryCode = await getCountryCodeFromIp(userIpAddress);
        try {
            const validAmount = Number(amount)
            const fundWallet = await walletService.fundWalletGeneral(userId, validAmount, 'usd', countryCode, paymentGateway)
            res.status(200).json(fundWallet)
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new WalletController();