import { PaymentGateway, TransactionReference, TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
// import paystackServices from "./paystack.services";
import transactionService from "./transaction.services";
import stripeService from "./stripe.service";
import paymentGatewayService from "./paymentGateway.service";
import flutterWaveService from "./flutterWave.service";
import { generateIDs } from "../utils/helpers";
import axios from 'axios';
import { Decimal } from "@prisma/client/runtime/library";

async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = response.data.rates[to];

    if (!rate) throw new Error('Currency conversion rate not found');

    return amount * rate;
}


class WalletService {

    // NOTE: Is there need to be checking hte userId here? 
    async ensureSufficientBalance(walletId: string, userId: string, amount: number) {
        const wallet = await prismaClient.wallet.findUnique({
            where: { id: walletId, userId }
        });
        if (!wallet) {
            throw new Error(`Wallet not found.`);
        }
        if (wallet.balance.toNumber() < amount) {
            throw new Error(`Insufficient balance.`);
        }
    }

    async getOrCreateWallet(userId: string) {
        let wallet = await prismaClient.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            wallet = await prismaClient.wallet.create({
                data: {
                    userId,
                    balance: 0,
                },
            });
        }

        return wallet;
    }

    // async fundWallet(userId: string, amount: number) {
    //     const wallet = await this.getOrCreateWallet(userId);
    //     const user = await prismaClient.users.findUnique({
    //         where: { id: userId },
    //         include: {
    //             profile: {
    //                 select: {
    //                     fullname: true,
    //                 }
    //             }
    //         }
    //     });
    //     if (!user) {
    //         throw new Error("User not found.")
    //     }

    //     const transactionDetails = {
    //         amount: amount,
    //         email: user.email,
    //     }
    //     console.log(transactionDetails);
    //     const paymentResponse = await paystackServices.initializePayment({ ...transactionDetails })

    //     const transactionRespDetails = await transactionService.createTransaction({
    //         userId,
    //         amount: amount,
    //         description: `Wallet funding of ${amount}`,
    //         type: TransactionType.CREDIT,
    //         status: TransactionStatus.PENDING,
    //         reference: TransactionReference.FUND_WALLET,
    //         walletId: wallet.id,
    //         referenceId: paymentResponse.data.reference
    //     })
    //     return {
    //         authorizationUrl: paymentResponse.data.authorization_url,
    //         transactionRespDetails
    //     };
    // }

    async fundWalletUsingStripe(userId: string, amount: number, currency: string = 'usd') {
        const wallet = await this.getOrCreateWallet(userId);
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    select: {
                        fullname: true,
                    }
                }
            }
        });

        if (!user) {
            throw new Error("User not found.");
        }

        // Get or create Stripe customer
        const stripeCustomer = await stripeService.createOrGetStripeCustomer(userId);
        console.log(stripeCustomer);

        // Create a Stripe PaymentIntent
        const paymentIntent = await stripeService.createPaymentIntent(
            amount * 100,
            currency,
            stripeCustomer.id
        );

        // Create a transaction record
        const transaction = await transactionService.createTransaction({
            userId,
            amount: amount,
            description: `Wallet funding of ${amount} ${currency.toUpperCase()}`,
            type: TransactionType.CREDIT,
            status: TransactionStatus.PENDING,
            reference: TransactionReference.FUND_WALLET,
            walletId: wallet.id,
            referenceId: paymentIntent.id, // Use Stripe PaymentIntent ID as reference
            stripePaymentIntentId: paymentIntent.id,
        });

        return {
            clientSecret: paymentIntent.client_secret,
            transactionDetails: transaction,
        };
    }

    async fundWalletUsingFlutter(userId: string, amount: number, currency: string = 'usd') {

        const wallet = await this.getOrCreateWallet(userId);
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    select: {
                        fullname: true,
                    }
                }
            }
        });

        if (!user) {
            throw new Error("User not found.");
        }
        const referenceId = generateIDs('FTWREF')
        const flutterwavePayment = await flutterWaveService.initializePayment(
            amount,
            currency,
            user.email,
            user.profile?.fullname || user.email,
            referenceId
        );
        const paymentResponse = flutterwavePayment;
        const paymentUrl = flutterwavePayment.data.link;
        // Create a transaction record

        const transaction = await transactionService.createTransaction({
            userId,
            amount: amount,
            description: `Wallet funding of ${amount} ${currency.toUpperCase()}`,
            type: TransactionType.CREDIT,
            status: TransactionStatus.PENDING,
            reference: TransactionReference.FUND_WALLET,
            walletId: wallet.id,
            referenceId: referenceId,
            paymentGateway: PaymentGateway.FLUTTERWAVE,
        });

        return {
            paymentUrl: paymentUrl,
            transactionDetails: transaction,
            paymentResponse: paymentResponse,
        };
    }

    async fundWalletGeneral(userId: string, amount: number, currency: string = 'usd', countryCode: string, paymentGateway:PaymentGateway) {
        const wallet = await this.getOrCreateWallet(userId);
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    select: {
                        fullname: true,
                    }
                }
            }
        });

        if (!user) {
            throw new Error("User not found.");
        }
        console.log(countryCode)
        const gateway = paymentGateway ? paymentGateway : paymentGatewayService.selectGateway(countryCode);
        console.log(gateway);

        let paymentResponse;
        let referenceId;
        let paymentUrl;

        switch (gateway) {
            case PaymentGateway.STRIPE:
                const stripeCustomer = await stripeService.createOrGetStripeCustomer(userId);
                const paymentIntent = await stripeService.createPaymentIntent(
                    amount * 100, // Stripe expects amounts in cents
                    currency,
                    stripeCustomer.id
                );
                paymentResponse = paymentIntent;
                referenceId = paymentIntent.id;
                break;

            case PaymentGateway.FLUTTERWAVE:
                referenceId = generateIDs('FTWREF')
                const flutterwavePayment = await flutterWaveService.initializePayment(
                    amount,
                    currency,
                    user.email,
                    user.profile?.fullname || user.email,
                    referenceId
                );
                paymentResponse = flutterwavePayment;
                paymentUrl = flutterwavePayment.data.link;
                break;

            case PaymentGateway.PAYSTACK:
                const transactionDetails = {
                    amount: amount,
                    email: user.email,
                }
                const paystackPayment = await paystackServices.initializePayment({ ...transactionDetails });
                paymentResponse = paystackPayment;
                referenceId = paystackPayment.data.reference;
                paymentUrl = paystackPayment.data.authorization_url;
                break;

            default:
                throw new Error("Unsupported payment gateway");
        }

        // Create a transaction record
        const transaction = await transactionService.createTransaction({
            userId,
            amount: amount,
            description: `Wallet funding of ${amount} ${currency.toUpperCase()} via ${gateway}`,
            type: TransactionType.CREDIT,
            status: TransactionStatus.PENDING,
            reference: TransactionReference.FUND_WALLET,
            walletId: wallet.id,
            referenceId: referenceId,
            paymentGateway: gateway,
            ...(gateway === PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId }),
        });

        return {
            paymentDetails: paymentResponse,
            transactionDetails: transaction,
            paymentUrl: paymentUrl,
        };
    }
}

export default new WalletService();