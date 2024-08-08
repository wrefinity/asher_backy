import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";

class WalletController {
    async getUserWallet(req:CustomRequest, res: Response){
        const userId = String(req.user.id)

        try {
            const userWallet = await walletService.getOrCreateWallet(userId)
            res.status(200).json(userWallet)
            
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new WalletController();