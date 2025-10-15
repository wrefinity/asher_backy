import { Currency, PaymentGateway, TransactionReference, TransactionStatus, TransactionType, wallet } from "@prisma/client";
import { prismaClient } from "..";
// import paystackServices from "./paystack.services";
import { v4 as uuidv4 } from 'uuid';
import transactionService from "./transaction.services";
import stripeService from "./stripe.service";
import paymentGatewayService from "./paymentGateway.service";
import flutterWaveService from "./flutterWave.service";
import { generateIDs } from "../utils/helpers";
import { Decimal } from "@prisma/client/runtime/library";
import { convertCurrency, getCurrentCountryCurrency } from "../utils/helpers"
import paystackServices from "./paystack.services";



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

    // Get wallet by ID
    async getWalletById(walletId: string) {
        return await prismaClient.wallet.findUnique({
            where: { id: walletId },
            select: {
                id: true,
                userId: true,
                balance: true,
                currency: true,
                isActive: true
            }
        });
    }

    getUserWallet = async (userId: string, currency: string) => {
        return await prismaClient.wallet.findFirst({
            where: { userId, currency, isActive: true },
        });
    }


    getUserWallets = async (userId: string): Promise<wallet[]> => {
        return prismaClient.wallet.findMany({
            where: { userId, isActive: true },
        });
    }

    getOrCreateWallet = async (userId: string, currency: Currency = Currency.NGN) => {
        let wallet = await prismaClient.wallet.findFirst({
            where: { userId, currency, isActive: true },
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
    async getWalletBalance(userId: string, currency: Currency): Promise<Decimal> {
        const wallet = await this.getOrCreateWallet(userId, currency);
        return wallet.balance;
    }


    async transferBetweenWallets(
        senderUserId: string,
        senderWalletId: string,
        receiverWalletId: string,
        amount: number
    ) {
        // Validate amount
        if (amount < 0) {
            throw new Error('Amount must be greater than zero');
        }
        return prismaClient.$transaction(async (tx) => {
            // Verify sender wallet belongs to sender
            const senderWallet = await tx.wallet.findUnique({
                where: { id: senderWalletId },
                include: {
                    user: {
                        select: {
                            email: true,
                            id: true
                        }
                    }
                }
            });

            if (!senderWallet || senderWallet.userId !== senderUserId) {
                throw new Error('Sender wallet not found');
            }

            if (senderWallet.balance.lt(amount)) {
                throw new Error('Insufficient balance');
            }

            const receiverWallet = await tx.wallet.findUnique({
                where: { id: receiverWalletId },
                include: {
                    user: {
                        select: {
                            email: true,
                            id: true
                        }
                    }
                }
            });

            if (!receiverWallet) {
                throw new Error('Receiver wallet not found');
            }

            if (senderWallet.currency !== receiverWallet.currency) {
                throw new Error('Cannot transfer between different currencies');
            }

            // Deduct from sender
            await tx.wallet.update({
                where: { id: senderWalletId },
                data: {
                    balance: {
                        decrement: amount,
                    },
                },
            });

            // Add to receiver
            await tx.wallet.update({
                where: { id: receiverWalletId },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });

            // Create transactions


            let baseTransferId = generateIDs('TRF');
            const now = new Date();

            // Sender transaction
            await tx.transaction.create({
                data: {
                    wallet: { connect: { id: senderWalletId } },
                    user: { connect: { id: senderWallet.user.id } },
                    amount,
                    type: TransactionType.DEBIT,
                    status: TransactionStatus.COMPLETED,
                    description: `Transfer to ${receiverWallet.user?.email || receiverWalletId}`,
                    referenceId: `${baseTransferId}_OUT`,  // 👈 unique suffix
                    reference: TransactionReference.TRANSFER,
                    createdAt: now,
                    updatedAt: now,
                    metadata: { receiverWalletId, direction: 'out', baseTransferId }
                }
            });

            // Receiver transaction
            await tx.transaction.create({
                data: {
                    wallet: { connect: { id: receiverWalletId } },
                    user: { connect: { id: receiverWallet.user.id } },
                    amount,
                    type: TransactionType.CREDIT,
                    status: TransactionStatus.COMPLETED,
                    description: `Transfer from ${senderWallet.user?.email || senderWalletId}`,
                    referenceId: `${baseTransferId}_IN`,  // 👈 unique suffix
                    reference: TransactionReference.TRANSFER,
                    createdAt: now,
                    updatedAt: now,
                    metadata: { senderWalletId, direction: 'in', baseTransferId }
                }
            });

            return { success: true };
        });
    }


    async verifyStripePayment(paymentIntent) {
        return await stripeService.verifyPaymentIntent(paymentIntent);
    }
    async verifyPaystackPayment(paymentIntent) {
        return await paystackServices.verifyPayment(paymentIntent);
    }

    fundWalletGeneral = async (userId: string, amount: number, currency: Currency = Currency.USD, countryCode: string, paymentGateway: PaymentGateway, payment_method?: string) => {
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
        const gateway = paymentGateway ? paymentGateway : paymentGatewayService.selectGateway(countryCode);
        console.log(gateway);

        let paymentResponse;
        let referenceId;
        let paymentUrl;

        switch (gateway) {
            case PaymentGateway.STRIPE:
                const stripeCustomer = await stripeService.createOrGetStripeCustomer(userId);
                const paymentIntent = await stripeService.createPaymentIntent(
                    userId,
                    amount, // Stripe expects amounts in cents
                    currency,
                    stripeCustomer.id,
                    wallet.id
                );
                paymentResponse = paymentIntent;
                referenceId = paymentIntent.id;
                break;

            // case PaymentGateway.FLUTTERWAVE:
            //     referenceId = generateIDs('FTWREF')
            //     const flutterwavePayment = await flutterWaveService.initializePayment(
            //         amount,
            //         currency,
            //         user.email,
            //         user.profile?.fullname || user.email,
            //         referenceId
            //     );
            //     paymentResponse = flutterwavePayment;
            //     paymentUrl = flutterwavePayment.data.link;
            //     break;

            case PaymentGateway.PAYSTACK:

                const paystackPayment = await paystackServices.initializePayment(userId, amount, currency, user.email);
                paymentResponse = paystackPayment;
                referenceId = paystackPayment.reference;
                paymentUrl = paystackPayment.authorizationUrl;
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

    // Note matching currency may come from property.currency intended to be purchased
    deductBalance = async (userId: string, price: Decimal, currency: Currency, matchingCurrency: string = null) => {
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

    async initiatePayout(
        userId: string,
        walletId: string,
        amount: number,
        bankDetails: any,
        currency: Currency
    ) {
        const wallet = await this.getWalletById(walletId);

        if (!wallet || wallet.userId !== userId) {
            throw new Error('Wallet not found');
        }

        if (wallet.balance.lt(amount)) {
            throw new Error('Insufficient balance');
        }

        if (wallet.currency !== currency) {
            throw new Error('Currency mismatch');
        }

        // Create a pending withdrawal transaction
        const reference = `payout-${Date.now()}`;
        await transactionService.createTransact({
            walletId,
            userId,
            reference: TransactionReference.WITHDRAWAL,
            amount: new Decimal(amount),
            currency,
            referenceId: reference,
            metadata: { bankDetails, status: 'processing' }
        });

        try {
            if (currency === 'NGN') {
                // Process via Paystack
                await paystackServices.processPaystackPayout(walletId, amount, bankDetails, reference);
            } else if (currency === 'GBP') {
                // Process via Stripe
                await stripeService.processStripePayout(walletId, amount, bankDetails, reference);
            } else {
                throw new Error('Unsupported currency for payout');
            }
        } catch (error) {
            await transactionService.updateTransactionStatus(reference, TransactionStatus.FAILED, { error: error.message });
            throw error;
        }
    }

    async updateWalletBalance(
        walletId: string,
        amount: Decimal,
        operation: 'increment' | 'decrement'
    ): Promise<wallet> {
        return prismaClient.wallet.update({
            where: { id: walletId },
            data: {
                balance: {
                    [operation]: amount,
                },
            },
        });
    }
}

export default new WalletService();