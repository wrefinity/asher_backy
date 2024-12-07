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
const __1 = require("../..");
class CreditScoreService {
    constructor() {
        this.MAX_SCORE = 900;
        this.MIN_SCORE = 100;
    }
    calculateCreditScore(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield __1.prismaClient.users.findUnique({
                    where: { id: userId },
                    include: {
                        tenant: true,
                        landlords: true,
                        ratingsReceived: true,
                    },
                });
                if (!user) {
                    throw new Error('User not found');
                }
                let score = 250;
                console.log(`Score: ${score}`);
                // Calculate based on payment history
                const paymentHistory = yield this.calculatePaymentHistoryScore(user);
                score += paymentHistory * 100;
                console.log(`Score: ${score}`);
                // Calculate based on rent history
                const rentalHistory = yield this.calculateRentalHistory(user);
                score += rentalHistory * 50;
                // Calculate based on maintenance score
                // const maintainanceScore = await this.calculateMaintainanceScore(user);
                const maintainanceScore = 0;
                score += maintainanceScore * 30; // Adjust weight as needed
                // Calculate based on rating score
                const ratingHistory = yield this.calculateRatingScore(user.ratingsReceived);
                score += ratingHistory * 20;
                const finalScore = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, Math.round(score)));
                console.log(`This is the returned result: ${finalScore}`);
                return {
                    score: finalScore,
                    paymentHistory,
                    rentalHistory,
                    maintainanceScore,
                    reviewScore: ratingHistory,
                };
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    calculatePaymentHistoryScore(user) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement payment history score calculation
            const payments = yield __1.prismaClient.transaction.findMany({
                where: { userId: user.id, reference: client_1.TransactionReference.RENT_PAYMENT },
                orderBy: { createdAt: 'desc' },
                take: 8, // consider the last 8 payments
            });
            if (payments.length === 0)
                return 0.2; //Neutral score if no payment
            console.log(`Couldnt find user used 0.2`);
            let onTimePayments = 0;
            let latePayments = 0;
            let missedPayments = 0;
            payments.forEach(payment => {
                //TODO: Note dueDatepayment for the transaction type
                const dueDate = new Date();
                const paymentDate = new Date(payment.createdAt);
                if (paymentDate <= dueDate) {
                    onTimePayments += 1;
                }
                else if (paymentDate <= new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000)) { //grace period of 30 days
                    latePayments += 1;
                }
                else {
                    missedPayments += 1;
                }
            });
            const score = (onTimePayments * 1 + latePayments * 0.3) / payments.length;
            return Math.min(Math.max(score, 0), 1); //ensure that the score is between 0 and 1 (Note: multiply by 100)
        });
    }
    calculateRentalHistory(user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tenancies = yield __1.prismaClient.tenants.findMany({
                    where: { userId: user.id },
                    orderBy: { leaseStartDate: 'desc' },
                });
                if (tenancies.length === 0)
                    return 0.2;
                const currentDate = new Date();
                let totalDuration = 0;
                let completedTenancies = 0;
                let onTimePaidTenancies = 0;
                tenancies.forEach(tenancy => {
                    const startDate = tenancy.leaseStartDate;
                    const endDate = tenancy.isCurrentLease ? currentDate : (tenancy.leaseEndDate || currentDate);
                    totalDuration += (endDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000); // in years
                    if (!tenancy.isCurrentLease) {
                        completedTenancies += 1;
                        if (tenancy.rentstatus === 1) {
                            onTimePaidTenancies += 1;
                        }
                    }
                });
                const averageDuration = totalDuration / tenancies.length;
                const averageCompletionRate = completedTenancies / tenancies.length;
                const averageOnTimePaymentRate = completedTenancies > 0 ? onTimePaidTenancies / completedTenancies : 0;
                const durationScore = Math.min(averageDuration / 2, 1);
                const score = (durationScore * 0.3) + (averageCompletionRate * 0.2) + (averageOnTimePaymentRate * 0.3);
                return Math.min(Math.max(score, 0), 1); // Ensure the score is between 0 and 1
            }
            catch (error) {
                console.error('Error calculating rental history:', error);
                return 0.2;
            }
        });
    }
    calculateRatingScore(ratings) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ratings.length === 0)
                return 0.4;
            const totalScore = ratings.reduce((sum, rating) => sum + rating.ratingValue, 0);
            const averageScore = totalScore / ratings.length;
            return averageScore / 5; //our rating scale should be 5-star rating
        });
    }
    updateCreditScore(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { score, paymentHistory, rentalHistory, maintainanceScore, reviewScore, } = yield this.calculateCreditScore(userId);
            try {
                yield __1.prismaClient.creditScore.upsert({
                    where: { userId },
                    update: {
                        score,
                        paymentHistory,
                        rentalHistory,
                        maintainanceScore,
                        reviewScore,
                        lastUpdated: new Date(),
                    },
                    create: {
                        userId,
                        score,
                        paymentHistory,
                        rentalHistory,
                        maintainanceScore,
                        reviewScore,
                    },
                });
            }
            catch (error) {
                console.log(error);
            }
            console.log(`Credit score updated for user ${userId} with score ${score}`);
        });
    }
}
exports.default = CreditScoreService;
