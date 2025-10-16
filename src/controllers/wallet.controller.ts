import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";
import { getCountryCodeFromIp } from "../utils/helpers";
import { Currency, PaymentGateway } from '@prisma/client';
import { getCurrentCountryCurrency } from "../utils/helpers";
import paystackServices from "../services/paystack.services";
import stripeService from "../services/stripe.service";

class WalletController {
    getUserWallet = async (req: CustomRequest, res: Response) => {
        const userId = req.user.id;
        // Parse the currency from query params, default to NGN if not provided
        const currencyParam = req.query.locationCurrency as string;

        // Validate and set the currency
        let currency: Currency;
        if (currencyParam === 'GBP') {
            currency = Currency.GBP;
        } else {
            // Default to NGN if not specified or invalid
            currency = Currency.NGN;
        }

        try {
            const userWallet = await walletService.getOrCreateWallet(userId, currency);
            res.status(200).json({ userWallet });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    getUserWallets = async (req: CustomRequest, res: Response) => {

        const userId = String(req.user.id)
        try {
            const userWallets = await walletService.getUserWallets(userId);
            res.status(200).json({ userWallets })

        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    getUserWalletsByUserId = async (req: CustomRequest, res: Response) => {

        const userId = req.params.userId;
        try {
            const userWallets = await walletService.getUserWallets(userId);
            res.status(200).json({ userWallets })

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async fundWallet(req: CustomRequest, res: Response) {
        const userId = String(req.user.id)
        const { amount, paymentGateway, currency, payment_method } = req.body


        if (![Currency.NGN, Currency.GBP].includes(currency)) {
            return res.status(400).json({ error: `Unsupported currency: ${Currency.NGN} or ${Currency.GBP} are the only options` });
        }

        if (!Object.values(PaymentGateway).includes(paymentGateway)) {
            return res.status(400).json({ message: 'Invalid payment gateway' });
        }

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
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
        const { paymentGateway } = req.body;
        if (!Object.values(PaymentGateway).includes(paymentGateway)) {
            return res.status(400).json({ message: 'Invalid payment gateway' });
        }
        try {
            let transaction;

            if (paymentGateway === PaymentGateway.STRIPE) {
                transaction = await walletService.verifyStripePayment(paymentIntent);
            } else if (paymentGateway === PaymentGateway.PAYSTACK) {
                transaction = await walletService.verifyPaystackPayment(paymentIntent);
            } else {
                return res.status(400).json({ error: 'Invalid payment provider' });
            }

            res.json({ success: true, transaction });
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

            // Verify sender wallet belongs to user
            const senderWallet = await walletService.getWalletById(senderWalletId);
            if (!senderWallet || senderWallet.userId !== userId) {
                return res.status(403).json({ message: 'Invalid sender wallet' });
            }

            // Perform transfer
            const result = await walletService.transferBetweenWallets(
                userId,
                senderWalletId,
                receiverWalletId,
                amount
            );

            res.json(result);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    async initiatePayout(req: CustomRequest, res: Response) {
        const userId = req.user.id;
        const { walletId, amount, bankDetails, currency } = req.body;

        try {
            await walletService.initiatePayout(
                userId,
                walletId,
                amount,
                bankDetails,
                currency
            );
            res.json({ success: true });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

export default new WalletController();