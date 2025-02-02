import { PaymentGateway, TransactionReference, TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
// import paystackServices from "./paystack.services";
import { v4 as uuidv4 } from 'uuid';
import transactionService from "./transaction.services";
import stripeService from "./stripe.service";
import paymentGatewayService from "./paymentGateway.service";
import flutterWaveService from "./flutterWave.service";
import { generateIDs } from "../utils/helpers";
import axios from 'axios';
import { Decimal } from "@prisma/client/runtime/library";
import { convertCurrency, getCurrentCountryCurrency } from "../utils/helpers"



class WalletService {


    ensureSufficientBalance = async (walletId: string | null, userId: string | null, amount: Decimal) => {
        if (!walletId && !userId) {
            throw new Error("Either walletId or userId must be provided.");
        }
        // Build dynamic where clause
        const whereClause: any = { isActive: true };
        if (walletId) whereClause.id = walletId;
        if (userId) whereClause.userId = userId;

        const wallet = await prismaClient.wallet.findFirst({
            where: whereClause,
        });

        if (!wallet) throw new Error(`Wallet not found.`);

        if (wallet.balance.lt(amount)) {
            throw new Error('Insufficient wallet balance');
        }
    };


    getUserWallet = async (userId: string, currency: string) => {
        return await prismaClient.wallet.findFirst({
            where: { userId, currency, isActive:true },
        });
    }

    getOrCreateWallet = async (userId: string, currency: string = "NGN") => {
        let wallet = await prismaClient.wallet.findFirst({
            where: { userId, currency, isActive:true },
        });
        if (!wallet) {
            wallet = await prismaClient.wallet.create({
                data: {
                    user: {
                        connect: { id: userId },
                    },
                    balance: 0.0,
                    currency,
                    isActive: true,
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
        const wallet = await this.getOrCreateWallet(userId, currency);
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

        const wallet = await this.getOrCreateWallet(userId, currency);
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

    fundWalletGeneral = async (userId: string, amount: number, currency: string = 'usd', countryCode: string, paymentGateway: PaymentGateway) =>{
        const wallet = await this.getOrCreateWallet(userId, currency);
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

            // case PaymentGateway.PAYSTACK:
            //     const transactionDetails = {
            //         amount: amount,
            //         email: user.email,
            //     }
            //     const paystackPayment = await paystackServices.initializePayment({ ...transactionDetails });
            //     paymentResponse = paystackPayment;
            //     referenceId = paystackPayment.data.reference;
            //     paymentUrl = paystackPayment.data.authorization_url;
            //     break;

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

    // function by wrashtech
    fundWalletGeneric = async (userId: string, amount: number, currency: string) => {
        const wallet = await this.getOrCreateWallet(userId, currency);
        if (!wallet) throw new Error('Wallet not found');

        // Use a currency conversion API to normalize the amount
        // const convertedAmount = await convertCurrency(amount, currency, wallet.currency);

        const wallet_credit = await prismaClient.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amount } },
        });
        const referenceId = uuidv4();
        await prismaClient.transaction.create({
            data: {
                userId,
                amount,
                currency,
                type: TransactionType.CREDIT,
                referenceId,
                reference: TransactionReference.FUND_WALLET,
                status: TransactionStatus.COMPLETED,
            },
        });

        return wallet_credit;
    }
    // Note matching currency may come from property.currency intended to be purchased
    deductBalance = async (userId: string, price: Decimal, currency: string, matchingCurrency: string = null) => {
        const wallet = await this.getOrCreateWallet(userId, currency);
        if (!wallet) throw new Error('Wallet not found');

        // handle scenario where a matching currency type is needed for transaction
        if (matchingCurrency && matchingCurrency != wallet.currency) {
            throw new Error('transaction needs same currency type');
        }
        const { locationCurrency } = await getCurrentCountryCurrency()
        if (!matchingCurrency && locationCurrency != currency) {
            `Transaction requires a wallet in ${locationCurrency}, but got ${currency}`
        }
        // const convertedPrice = await convertCurrency(price, property.currency, wallet.currency);
        // Convert price to Decimal if necessary
        const decimalPrice = price instanceof Decimal ? price : new Decimal(price);

        if (wallet.balance.lt(decimalPrice)) {
            throw new Error('Insufficient wallet balance');
        }


        // Deduct balance and record the transaction
        // wallet.balance.minus(decimalPrice)
        await prismaClient.wallet.update({
            where: {
                id: wallet.id,
                userId_currency: {
                    userId,
                    currency,
                },
            },
            data: { balance: { decrement: decimalPrice } },
        });


        const transaction = await prismaClient.transaction.create({
            data: {
                userId,
                amount: decimalPrice,
                currency: wallet.currency,
                type: TransactionType.DEBIT,
                reference: TransactionReference.MAKE_PAYMENT,
                status: TransactionStatus.COMPLETED,
                referenceId: uuidv4()
            },
        });
        return transaction
    }

    activateWallet = async (userId: string, walletId: string) => {
        // Deactivate all other wallets for the user
        await prismaClient.wallet.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        // Activate the wallet with the provided walletId
        const updatedWallet = await prismaClient.wallet.update({
            where: { id: walletId },
            data: { isActive: true },
        });

        return updatedWallet;
    }

   
}

export default new WalletService();