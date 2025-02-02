"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const __1 = require("..");
// import paystackServices from "./paystack.services";
const uuid_1 = require("uuid");
const transaction_services_1 = __importDefault(require("./transaction.services"));
const stripe_service_1 = __importDefault(require("./stripe.service"));
const paymentGateway_service_1 = __importDefault(require("./paymentGateway.service"));
const flutterWave_service_1 = __importDefault(require("./flutterWave.service"));
const helpers_1 = require("../utils/helpers");
const library_1 = require("@prisma/client/runtime/library");
const helpers_2 = require("../utils/helpers");
class WalletService {
    constructor() {
        this.ensureSufficientBalance = (walletId, userId, amount) => __awaiter(this, void 0, void 0, function* () {
            if (!walletId && !userId) {
                throw new Error("Either walletId or userId must be provided.");
            }
            // Build dynamic where clause
            const whereClause = { isActive: true };
            if (walletId)
                whereClause.id = walletId;
            if (userId)
                whereClause.userId = userId;
            const wallet = yield __1.prismaClient.wallet.findFirst({
                where: whereClause,
            });
            if (!wallet)
                throw new Error(`Wallet not found.`);
            if (wallet.balance.lt(amount)) {
                throw new Error('Insufficient wallet balance');
            }
        });
        this.getUserWallet = (userId, currency) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.wallet.findFirst({
                where: { userId, currency, isActive: true },
            });
        });
        this.getOrCreateWallet = (userId_1, ...args_1) => __awaiter(this, [userId_1, ...args_1], void 0, function* (userId, currency = "NGN") {
            let wallet = yield __1.prismaClient.wallet.findFirst({
                where: { userId, currency, isActive: true },
            });
            if (!wallet) {
                wallet = yield __1.prismaClient.wallet.create({
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
        });
        this.fundWalletGeneral = (userId_1, amount_1, ...args_1) => __awaiter(this, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, currency = 'usd', countryCode, paymentGateway) {
            var _a;
            const wallet = yield this.getOrCreateWallet(userId, currency);
            const user = yield __1.prismaClient.users.findUnique({
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
            console.log(countryCode);
            const gateway = paymentGateway ? paymentGateway : paymentGateway_service_1.default.selectGateway(countryCode);
            console.log(gateway);
            let paymentResponse;
            let referenceId;
            let paymentUrl;
            switch (gateway) {
                case client_1.PaymentGateway.STRIPE:
                    const stripeCustomer = yield stripe_service_1.default.createOrGetStripeCustomer(userId);
                    const paymentIntent = yield stripe_service_1.default.createPaymentIntent(amount * 100, // Stripe expects amounts in cents
                    currency, stripeCustomer.id);
                    paymentResponse = paymentIntent;
                    referenceId = paymentIntent.id;
                    break;
                case client_1.PaymentGateway.FLUTTERWAVE:
                    referenceId = (0, helpers_1.generateIDs)('FTWREF');
                    const flutterwavePayment = yield flutterWave_service_1.default.initializePayment(amount, currency, user.email, ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.fullname) || user.email, referenceId);
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
            const transaction = yield transaction_services_1.default.createTransaction(Object.assign({ userId, amount: amount, description: `Wallet funding of ${amount} ${currency.toUpperCase()} via ${gateway}`, type: client_1.TransactionType.CREDIT, status: client_1.TransactionStatus.PENDING, reference: client_1.TransactionReference.FUND_WALLET, walletId: wallet.id, referenceId: referenceId, paymentGateway: gateway }, (gateway === client_1.PaymentGateway.STRIPE && { stripePaymentIntentId: referenceId })));
            return {
                paymentDetails: paymentResponse,
                transactionDetails: transaction,
                paymentUrl: paymentUrl,
            };
        });
        // function by wrashtech
        this.fundWalletGeneric = (userId, amount, currency) => __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getOrCreateWallet(userId, currency);
            if (!wallet)
                throw new Error('Wallet not found');
            // Use a currency conversion API to normalize the amount
            // const convertedAmount = await convertCurrency(amount, currency, wallet.currency);
            const wallet_credit = yield __1.prismaClient.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } },
            });
            const referenceId = (0, uuid_1.v4)();
            yield __1.prismaClient.transaction.create({
                data: {
                    userId,
                    amount,
                    currency,
                    type: client_1.TransactionType.CREDIT,
                    referenceId,
                    reference: client_1.TransactionReference.FUND_WALLET,
                    status: client_1.TransactionStatus.COMPLETED,
                },
            });
            return wallet_credit;
        });
        // Note matching currency may come from property.currency intended to be purchased
        this.deductBalance = (userId_1, price_1, currency_1, ...args_1) => __awaiter(this, [userId_1, price_1, currency_1, ...args_1], void 0, function* (userId, price, currency, matchingCurrency = null) {
            const wallet = yield this.getOrCreateWallet(userId, currency);
            if (!wallet)
                throw new Error('Wallet not found');
            // handle scenario where a matching currency type is needed for transaction
            if (matchingCurrency && matchingCurrency != wallet.currency) {
                throw new Error('transaction needs same currency type');
            }
            const { locationCurrency } = yield (0, helpers_2.getCurrentCountryCurrency)();
            if (!matchingCurrency && locationCurrency != currency) {
                `Transaction requires a wallet in ${locationCurrency}, but got ${currency}`;
            }
            // const convertedPrice = await convertCurrency(price, property.currency, wallet.currency);
            // Convert price to Decimal if necessary
            const decimalPrice = price instanceof library_1.Decimal ? price : new library_1.Decimal(price);
            if (wallet.balance.lt(decimalPrice)) {
                throw new Error('Insufficient wallet balance');
            }
            // Deduct balance and record the transaction
            // wallet.balance.minus(decimalPrice)
            yield __1.prismaClient.wallet.update({
                where: {
                    id: wallet.id,
                    userId_currency: {
                        userId,
                        currency,
                    },
                },
                data: { balance: { decrement: decimalPrice } },
            });
            const transaction = yield __1.prismaClient.transaction.create({
                data: {
                    userId,
                    amount: decimalPrice,
                    currency: wallet.currency,
                    type: client_1.TransactionType.DEBIT,
                    reference: client_1.TransactionReference.MAKE_PAYMENT,
                    status: client_1.TransactionStatus.COMPLETED,
                    referenceId: (0, uuid_1.v4)()
                },
            });
            return transaction;
        });
        this.activateWallet = (userId, walletId) => __awaiter(this, void 0, void 0, function* () {
            // Deactivate all other wallets for the user
            yield __1.prismaClient.wallet.updateMany({
                where: { userId, isActive: true },
                data: { isActive: false },
            });
            // Activate the wallet with the provided walletId
            const updatedWallet = yield __1.prismaClient.wallet.update({
                where: { id: walletId },
                data: { isActive: true },
            });
            return updatedWallet;
        });
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
    fundWalletUsingStripe(userId_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (userId, amount, currency = 'usd') {
            const wallet = yield this.getOrCreateWallet(userId, currency);
            const user = yield __1.prismaClient.users.findUnique({
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
            const stripeCustomer = yield stripe_service_1.default.createOrGetStripeCustomer(userId);
            console.log(stripeCustomer);
            // Create a Stripe PaymentIntent
            const paymentIntent = yield stripe_service_1.default.createPaymentIntent(amount * 100, currency, stripeCustomer.id);
            // Create a transaction record
            const transaction = yield transaction_services_1.default.createTransaction({
                userId,
                amount: amount,
                description: `Wallet funding of ${amount} ${currency.toUpperCase()}`,
                type: client_1.TransactionType.CREDIT,
                status: client_1.TransactionStatus.PENDING,
                reference: client_1.TransactionReference.FUND_WALLET,
                walletId: wallet.id,
                referenceId: paymentIntent.id, // Use Stripe PaymentIntent ID as reference
                stripePaymentIntentId: paymentIntent.id,
            });
            return {
                clientSecret: paymentIntent.client_secret,
                transactionDetails: transaction,
            };
        });
    }
    fundWalletUsingFlutter(userId_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (userId, amount, currency = 'usd') {
            var _a;
            const wallet = yield this.getOrCreateWallet(userId, currency);
            const user = yield __1.prismaClient.users.findUnique({
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
            const referenceId = (0, helpers_1.generateIDs)('FTWREF');
            const flutterwavePayment = yield flutterWave_service_1.default.initializePayment(amount, currency, user.email, ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.fullname) || user.email, referenceId);
            const paymentResponse = flutterwavePayment;
            const paymentUrl = flutterwavePayment.data.link;
            // Create a transaction record
            const transaction = yield transaction_services_1.default.createTransaction({
                userId,
                amount: amount,
                description: `Wallet funding of ${amount} ${currency.toUpperCase()}`,
                type: client_1.TransactionType.CREDIT,
                status: client_1.TransactionStatus.PENDING,
                reference: client_1.TransactionReference.FUND_WALLET,
                walletId: wallet.id,
                referenceId: referenceId,
                paymentGateway: client_1.PaymentGateway.FLUTTERWAVE,
            });
            return {
                paymentUrl: paymentUrl,
                transactionDetails: transaction,
                paymentResponse: paymentResponse,
            };
        });
    }
}
exports.default = new WalletService();
