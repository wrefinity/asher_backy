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
// services/landlordTransaction.service.ts
const client_1 = require("@prisma/client");
const __1 = require("../..");
class LandlordTransactionService {
    createPropertyTransaction(transactionData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.create({
                data: {
                    description: transactionData.description,
                    amount: transactionData.amount,
                    propertyId: transactionData.propertyId, // Correctly link to existing property
                    userId: transactionData.userId,
                    status: transactionData.transactionStatus,
                    type: transactionData.type,
                    referenceId: transactionData.referenceId,
                    reference: transactionData.reference,
                }
            });
        });
    }
    getPropertyTransactionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findUnique({
                where: {
                    id
                },
            });
        });
    }
    getPropertyTransactionsByLandlord(userId, propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findMany({
                where: {
                    userId: userId,
                    propertyId: propertyId
                },
            });
        });
    }
    getPropertyTransactionByReference(referenceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.transaction.findFirst({
                where: {
                    referenceId
                },
            });
        });
    }
    updatePropertyTransaction(transactionId, userId, transactionData) {
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
    handleSuccessfulPropertyPayment(respData) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.getPropertyTransactionByReference(respData.reference);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            yield this.updatePropertyTransaction(transaction.id, transaction.userId, {
                transactionStatus: client_1.TransactionStatus.COMPLETED,
            });
            // Handle any additional logic specific to landlord transactions here
        });
    }
    handleFailedPropertyPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.getPropertyTransactionByReference(data.reference);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            yield this.updatePropertyTransaction(transaction.id, transaction.userId, {
                transactionStatus: client_1.TransactionStatus.FAILED,
            });
        });
    }
    getTransactionSummary(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactions = yield __1.prismaClient.transaction.aggregate({
                where: {
                    userId,
                },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                },
            });
            const totalIncome = yield __1.prismaClient.transaction.aggregate({
                where: {
                    userId,
                    reference: {
                        in: [
                            client_1.TransactionReference.RENT_PAYMENT,
                            client_1.TransactionReference.BILL_PAYMENT
                        ]
                    }
                },
                _sum: {
                    amount: true
                }
            });
            const totalExpenses = yield __1.prismaClient.transaction.aggregate({
                where: {
                    userId,
                    reference: {
                        in: [
                            client_1.TransactionReference.MAINTENANCE_FEE,
                            client_1.TransactionReference.LANDLORD_PAYOUT
                        ]
                    }
                },
                _sum: {
                    amount: true
                }
            });
            const incomeAmount = totalIncome._sum.amount ? parseFloat(totalIncome._sum.amount.toString()) : 0;
            const expenseAmount = totalExpenses._sum.amount ? parseFloat(totalExpenses._sum.amount.toString()) : 0;
            const netIncome = incomeAmount - expenseAmount;
            return {
                totalIncome: totalIncome._sum.amount || 0,
                totalExpenses: totalExpenses._sum.amount || 0,
                netIncome
            };
        });
    }
}
exports.default = new LandlordTransactionService();
