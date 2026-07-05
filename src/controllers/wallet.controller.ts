import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import walletService from "../services/wallet.service";
import { getCountryCodeFromIp } from "../utils/helpers";
import { Currency, PaymentGateway } from '@prisma/client';
import { getClientIpFromRequest, resolveViewerCurrency } from "../utils/currencyContext";
import paystackServices from "../services/paystack.services";
import stripeService from "../services/stripe.service";
import { validateFundAmount, isSupportedFundCurrency } from "../utils/moneyAmount";
import { resolvePaymentGatewayForCurrency } from "../utils/paymentGateway.util";
import transactionServices from "../services/transaction.services";

class WalletController {
    getUserWallet = async (req: CustomRequest, res: Response) => {
        const userId = req.user.id;
        const currencyParam = req.query.locationCurrency as string | undefined;

        try {
            let currency: Currency;
            if (currencyParam && Object.values(Currency).includes(currencyParam as Currency)) {
                currency = currencyParam as Currency;
            } else {
                const viewer = await resolveViewerCurrency({
                    userId,
                    ipAddress: getClientIpFromRequest(req),
                });
                currency = (viewer.currency as Currency) || Currency.NGN;
            }

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
        const { amount, paymentGateway, currency, payment_method, callbackUrl } = req.body


        const supportedCurrencies = [Currency.NGN, Currency.GBP, Currency.USD, Currency.EUR];
        if (!supportedCurrencies.includes(currency)) {
            return res.status(400).json({ 
                error: `Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}` 
            });
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
        if (!isSupportedFundCurrency(currency)) {
            return res.status(400).json({
                error: `Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`,
            });
        }

        const expectedGateway = resolvePaymentGatewayForCurrency(currency);
        if (paymentGateway !== expectedGateway) {
            return res.status(400).json({
                message: `Use ${expectedGateway} for ${currency.toUpperCase()} payments (NGN → Paystack, GBP/UK → Stripe).`,
                expectedGateway,
            });
        }

        let validAmount: number;
        try {
            validAmount = validateFundAmount(amount, currency);
        } catch (validationError: any) {
            return res.status(400).json({ message: validationError.message || 'Invalid amount' });
        }

        // if (!payment_method) {
        //     return res.status(400).json({ message: 'Payment method is required' });
        // }
        const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const countryCode = await getCountryCodeFromIp(userIpAddress);
        try {
            const fundWallet = await walletService.fundWalletGeneral(
                userId,
                validAmount,
                currency.toString().toUpperCase() as Currency,
                countryCode,
                paymentGateway,
                payment_method,
                typeof callbackUrl === 'string' ? callbackUrl : undefined
            )
            res.status(200).json(fundWallet)
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    cancelFundAttempt = async (req: CustomRequest, res: Response) => {
        const userId = String(req.user.id);
        const { paymentIntentId, referenceId } = req.body as {
            paymentIntentId?: string;
            referenceId?: string;
        };

        const intentRef = paymentIntentId || referenceId;
        if (!intentRef) {
            return res.status(400).json({ message: 'paymentIntentId or referenceId is required' });
        }

        try {
            await stripeService.cancelPaymentIntent(intentRef);
            const cancelled = await transactionServices.failPendingFundByReference(
                userId,
                intentRef
            );

            return res.status(200).json({
                success: true,
                cancelled,
            });
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