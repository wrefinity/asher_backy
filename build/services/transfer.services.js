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
const wallet_service_1 = __importDefault(require("./wallet.service"));
const crypto_1 = require("crypto");
const transaction_services_1 = __importDefault(require("./transaction.services"));
class TransferService {
    constructor() {
        this.transferFunds = (senderId, data, currency) => __awaiter(this, void 0, void 0, function* () {
            const senderWallet = yield wallet_service_1.default.getOrCreateWallet(senderId, currency);
            const recieiverWallet = yield wallet_service_1.default.getOrCreateWallet(data.recieiverId, currency);
            // check that the receiver and the sender wallet has same currency type
            if (senderWallet.currency != recieiverWallet.currency)
                throw new Error("Both the sender and the receiver wallet must have same currency type");
            // ensure that the sender wallet has sufficient fund
            yield wallet_service_1.default.ensureSufficientBalance(senderWallet.id, senderWallet.userId, data.amount);
            return yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                //Deduct from sender's wallet
                yield prisma.wallet.update({
                    where: { id: senderWallet.id },
                    data: { balance: { decrement: data.amount } }
                });
                //Add to reciever's wallet
                yield prisma.wallet.update({
                    where: { id: recieiverWallet.id },
                    data: { balance: { increment: data.amount } }
                });
                // create transaction record
                const transactionRecord = yield prisma.transaction.create({
                    data: {
                        userId: senderId,
                        amount: data.amount,
                        description: data.description || `Transferred ${data.amount} to ${recieiverWallet.userId}`,
                        type: client_1.TransactionType.DEBIT,
                        reference: data.reference || client_1.TransactionReference.MAKE_PAYMENT,
                        status: client_1.TransactionStatus.COMPLETED,
                        walletId: senderWallet.id,
                        referenceId: `REF-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}`
                    },
                });
                return transactionRecord;
            }));
        });
        this.getTransactionsByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findMany({
                where: { userId },
                include: {
                    wallet: true
                }
            });
        });
        this.payBill = (data, tenantId, currency) => __awaiter(this, void 0, void 0, function* () {
            //get tenant information
            const tenant = yield __1.prismaClient.tenants.findUnique({
                where: { id: tenantId },
                include: {
                    landlord: {
                        select: { userId: true }
                    },
                    user: {
                        include: {
                            profile: {
                                select: { fullname: true }
                            }
                        }
                    }
                }
            });
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            const tenantWallet = yield wallet_service_1.default.getOrCreateWallet(tenant.userId, currency);
            const landlordWallet = yield wallet_service_1.default.getOrCreateWallet(tenant.landlord.userId, currency);
            yield wallet_service_1.default.ensureSufficientBalance(tenantWallet.id, tenantWallet.userId, data.amount);
            const transaction = yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                // Deduct from tenant's wallet
                const updatedTenantWallet = yield prisma.wallet.update({
                    where: { id: tenantWallet.id },
                    data: { balance: { decrement: data.amount } }
                });
                // Add to landlord's wallet
                const updatedLandlordWallet = yield prisma.wallet.update({
                    where: { id: landlordWallet.id },
                    data: { balance: { increment: data.amount } }
                });
                // create tenant transaction table
                const propertyTransaction = yield prisma.transaction.create({
                    data: {
                        userId: tenant.userId,
                        amount: data.amount,
                        description: `${data.billType} payment transaction`,
                        type: 'DEBIT',
                        reference: data.billType,
                        status: 'COMPLETED',
                        walletId: tenantWallet.id,
                        referenceId: `REF-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}`,
                        propertyId: tenant.propertyId,
                        apartmentId: tenant.apartmentOrFlatNumber.toString(),
                    },
                });
                //create landlord transaction
                yield transaction_services_1.default.createCounterpartyTransaction({
                    userId: tenant.landlord.userId,
                    amount: data.amount,
                    description: `${data.billType} payment received from ${(_b = (_a = tenant.user) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.fullname}`,
                    reference: data.billType,
                    walletId: landlordWallet.id,
                    propertyId: data === null || data === void 0 ? void 0 : data.propertyId,
                    apartmentId: data === null || data === void 0 ? void 0 : data.apartmentId,
                    billId: data === null || data === void 0 ? void 0 : data.billId,
                });
                // TODO: Update the model for auto payment
                // If set_auto is true, update tenant's auto-payment settings
                // if (data.set_auto) {
                //     await prisma.tenants.update({
                //         where: { id: tenant.id },
                //         data: { autoPaymentEnabled: true }
                //     });
                // }
                return {
                    propertyTransaction,
                    tenantWallet: updatedTenantWallet,
                    landlordWallet: updatedLandlordWallet,
                };
            }));
            return transaction;
        });
    }
    makeAdsPayments(amount, userId, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new Error('Tenant not found');
            }
            //get tenant wallet
            const userWallet = yield wallet_service_1.default.getOrCreateWallet(user.id, currency);
            yield wallet_service_1.default.ensureSufficientBalance(userWallet.id, userWallet.userId, amount);
            const transaction = yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Deduct from tenant's wallet
                const updatedUserWallet = yield prisma.wallet.update({
                    where: { id: userWallet.id },
                    data: { balance: { decrement: amount } }
                });
                // Add to payee's wallet -> for ads asher support
                // const updatedWallet = await prisma.wallet.update({
                //     where: { id: payee.id },
                //     data: { balance: { increment: data.amount } }
                // })
                // create transaction record
                const transactionRecord = yield transaction_services_1.default.createTransaction({
                    userId: user.id,
                    amount: amount,
                    description: 'Making payment for Ads',
                    reference: client_1.TransactionReference.MAKE_PAYMENT,
                    type: client_1.TransactionType.DEBIT,
                    status: client_1.TransactionStatus.COMPLETED,
                    walletId: userWallet.id,
                    referenceId: `REF-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}`
                });
                return {
                    transactionRecord,
                    userWallet: updatedUserWallet
                };
            }));
            return transaction;
        });
    }
}
exports.default = new TransferService();
