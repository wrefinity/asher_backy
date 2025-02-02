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
const crypto_1 = require("crypto");
const helpers_1 = require("../utils/helpers");
const wallet_service_1 = __importDefault(require("./wallet.service"));
const library_1 = require("@prisma/client/runtime/library");
class TransactionService {
    constructor() {
        this.createTransact = (data_1, ...args_1) => __awaiter(this, [data_1, ...args_1], void 0, function* (data, landlordId = null) {
            // 1. check for sufficient balance
            yield wallet_service_1.default.ensureSufficientBalance(data.walletId, data.userId, new library_1.Decimal(data.amount));
            // 2. check if the landlord has an account for this transaction same with the tenant
            const landlordWalletExitForSameCurrency = yield wallet_service_1.default.getUserWallet(landlordId, data.currency);
            if (!landlordWalletExitForSameCurrency)
                throw new Error("The landlord does not have same currency wallet, contact the landlord for the exact currency exchange wallet to use");
            // Map TransactionIF to Prisma's TransactionCreateInput
            const prismaData = {
                id: data.id,
                description: data.description,
                amount: data.amount,
                user: { connect: { id: data.userId } },
                wallet: data.walletId ? { connect: { id: data.walletId } } : undefined,
                type: data.type ? data.type : client_1.TransactionType.DEBIT,
                reference: data.reference,
                status: data.status ? data.status : client_1.TransactionStatus.PENDING, // Initial status (e.g., PENDING)
                referenceId: data.referenceId ? data.referenceId : (0, helpers_1.generateIDs)(`RF-${data.reference}`),
                paymentGateway: data.paymentGateway,
                stripePaymentIntentId: data.stripePaymentIntentId,
                property: data.propertyId ? { connect: { id: data.propertyId } } : undefined,
                apartment: data.apartmentId ? { connect: { id: data.apartmentId } } : undefined,
                bill: data.billId ? { connect: { id: data.billId } } : undefined,
                currency: data.currency,
            };
            // Create the transaction
            const transaction = yield __1.prismaClient.transaction.create({
                data: prismaData,
            });
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            // Update the wallet balance
            if (transaction.walletId) {
                yield __1.prismaClient.wallet.update({
                    where: { id: transaction.walletId },
                    data: {
                        balance: {
                            decrement: transaction.amount,
                        },
                    },
                });
                // Update the transaction status to COMPLETED
                yield __1.prismaClient.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: client_1.TransactionStatus.COMPLETED, // Update status to COMPLETED
                    },
                });
            }
            return transaction;
        });
        this.createTransaction = (transactionData) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.create({
                data: transactionData,
            });
        });
        this.getTransactionsByUser = (userId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findMany({
                where: {
                    userId
                },
            });
        });
        this.getTransactionByProps = (propertyId_1, ...args_1) => __awaiter(this, [propertyId_1, ...args_1], void 0, function* (propertyId, landlordId = null) {
            return __1.prismaClient.transaction.findMany({
                where: {
                    property: Object.assign({ id: propertyId }, (landlordId ? { landlordId } : {}))
                },
            });
        });
        this.getTransactionById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findUnique({
                where: {
                    id
                },
            });
        });
        this.getTransactionByReference = (referenceId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findFirst({
                where: {
                    referenceId
                },
            });
        });
        this.updateTransaction = (transactionId, userId, transactionData) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.update({
                where: {
                    id: transactionId,
                    userId
                },
                data: transactionData,
            });
        });
        // TODO: 
        // updateReferenceTransaction = async (userId: string) => {
        //     console.log("got here");
        //     return prismaClient.transaction.update({
        //         where: {
        //             userId
        //         },
        //         data: {
        //             status: TransactionStatus.COMPLETED,
        //         },
        //     });
        // }
        this.handleSuccessfulPayment = (respData) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.getTransactionByReference(respData.reference);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            yield this.updateTransaction(transaction.id, transaction.userId, {
                status: client_1.TransactionStatus.COMPLETED,
            });
            if (transaction.type === client_1.TransactionType.CREDIT && transaction.walletId) {
                //update the wallet balance
                yield __1.prismaClient.wallet.update({
                    where: { id: transaction.walletId },
                    data: {
                        balance: {
                            increment: transaction.amount,
                        }
                    }
                });
            }
        });
        this.handleFailedPayment = (data) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.getTransactionByReference(data.reference);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            yield this.updateTransaction(transaction.id, transaction.userId, {
                status: client_1.TransactionStatus.FAILED,
            });
        });
        this.createCounterpartyTransaction = (data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.create({
                data: Object.assign(Object.assign({}, data), { type: client_1.TransactionType.CREDIT, status: client_1.TransactionStatus.COMPLETED, referenceId: `REF-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}` })
            });
        });
    }
}
exports.default = new TransactionService();
