import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";
import { getCountryCodeFromIp } from "../utils/helpers";
import { PaymentGateway } from '@prisma/client';
import { getCurrentCountryCurrency } from "../utils/helpers";
import { Decimal } from '@prisma/client/runtime/library';

class WalletController {
    getUserWallet = async (req: CustomRequest, res: Response) =>{
        let locationCur = req.query.locationCurrency as string;
        if (!locationCur) {
            let _, locationCurrency = await getCurrentCountryCurrency();
            locationCur = locationCurrency?.toString()?.toUpperCase();
        }
        const userId = String(req.user.id)
        try {
            const userWallet = await walletService.getOrCreateWallet(userId, locationCur);
            res.status(200).json({userWallet})

        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    getUserWallets = async (req: CustomRequest, res: Response) =>{
    
        const userId = String(req.user.id)
        try {
            const userWallets = await walletService.getUserWallets(userId);
            res.status(200).json({userWallets})

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async fundWallet(req: CustomRequest, res: Response) {
        const userId = String(req.user.id)
        console.log('Funding wallet for user:', userId);
        const { amount, paymentGateway,  currency,  payment_method } = req.body
        if (!Object.values(PaymentGateway).includes(paymentGateway)) {
            return res.status(400).json({ message: 'Invalid payment gateway' });
        }

        if(!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Invalid amount provided' });
        }
        if (!currency) {
            return res.status(400).json({ message: 'Currency is required' });
        }

        // if (!payment_method) {
        //     return res.status(400).json({ message: 'Payment method is required' });
        // }
        const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const countryCode = await getCountryCodeFromIp(userIpAddress);
        console.log('Country Code:', countryCode);
        try {
            const validAmount = Number(amount)
            const fundWallet = await walletService.fundWalletGeneral(userId, validAmount, currency.toString().toUpperCase(), countryCode, paymentGateway, payment_method)
            res.status(200).json(fundWallet)
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    async verifyPayment(req: CustomRequest, res: Response) {
        const paymentIntent = req.params.paymentIntent;
        if (!paymentIntent) {
            return res.status(400).json({ message: 'No payment intent provided' });
        }
        const {paymentGateway } = req.body;
        if (!Object.values(PaymentGateway).includes(paymentGateway)) {
            return res.status(400).json({ message: 'Invalid payment gateway' });
        }   
        try {
            const fundWallet = await walletService.verifyStripePayment(paymentIntent)
            res.status(200).json(fundWallet)
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
        // Transfer balance between wallets
    async transferBalance(req: CustomRequest, res: Response) {
        try {

            const { senderWalletId, receiverWalletId, amount } = req.body;
            const userId = req.user.id; 
            
            // Validate input
            if (!senderWalletId || !receiverWalletId || amount === undefined) {
                return res.status(400).json({ message: 'Missing required parameters' });
            }

            // Convert amount to Decimal
            const decimalAmount = new Decimal(amount.toString());
            
            // Verify sender wallet belongs to user
            const senderWallet = await walletService.getWalletById(senderWalletId);
            if (!senderWallet || senderWallet.userId !== userId) {
                return res.status(403).json({ message: 'Invalid sender wallet' });
            }
            
            // Perform transfer
            const result = await walletService.transferBalance(
                senderWalletId,
                receiverWalletId,
                decimalAmount
            );
            
            res.json({
                message: 'Transfer successful',
                senderWallet: result.senderWallet,
                receiverWallet: result.receiverWallet,
                transactions: {
                    sender: result.senderTransaction,
                    receiver: result.receiverTransaction
                }
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

export default new WalletController();