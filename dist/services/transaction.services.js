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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const __1 = require("..");
const crypto_1 = require("crypto");
class TransactionService {
    createTransaction(transactionData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.create({
                data: transactionData,
            });
        });
    }
    getTransactionsByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findMany({
                where: {
                    userId
                },
            });
        });
    }
    getTransactionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findUnique({
                where: {
                    id
                },
            });
        });
    }
    getTransactionByReference(referenceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findFirst({
                where: {
                    referenceId
                },
            });
        });
    }
    updateTransaction(transactionId, userId, transactionData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.update({
                where: {
                    id: transactionId,
                    userId
                },
                data: transactionData,
            });
        });
    }
    updateReferenceTransaction(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("got here");
            return __1.prismaClient.transaction.update({
                where: {
                    userId
                },
                data: {
                    status: client_1.TransactionStatus.COMPLETED,
                },
            });
        });
    }
    handleSuccessfulPayment(respData) {
        return __awaiter(this, void 0, void 0, function* () {
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
    }
    handleFailedPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.getTransactionByReference(data.reference);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            yield this.updateTransaction(transaction.id, transaction.userId, {
                status: client_1.TransactionStatus.FAILED,
            });
        });
    }
    createCounterpartyTransaction(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.create({
                data: Object.assign(Object.assign({}, data), { type: client_1.TransactionType.CREDIT, status: client_1.TransactionStatus.COMPLETED, referenceId: `REF-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString('hex')}` })
            });
        });
    }
}
exports.default = new TransactionService();
