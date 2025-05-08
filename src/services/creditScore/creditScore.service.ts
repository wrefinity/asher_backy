import { Rating, TransactionReference, users } from "@prisma/client";
import { prismaClient } from "../..";

interface CreditScoreType {
    score: number;
    paymentHistory: number;
    rentalHistory: number;
    maintainanceScore: number;
    reviewScore: number;
}

class CreditScoreService {
    private readonly MAX_SCORE = 900
    private readonly MIN_SCORE = 100

    constructor() {
    }

    async calculateCreditScore(userId: string): Promise<CreditScoreType> {
        try {
            const user = await prismaClient.users.findUnique({
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
            const paymentHistory = await this.calculatePaymentHistoryScore(user);
            score += paymentHistory * 100;
            console.log(`Score: ${score}`);

            // Calculate based on rent history
            const rentalHistory = await this.calculateRentalHistory(user);
            score += rentalHistory * 50;

            // Calculate based on maintenance score
            // const maintainanceScore = await this.calculateMaintainanceScore(user);
            const maintainanceScore = 0;
            score += maintainanceScore * 30; // Adjust weight as needed

            // Calculate based on rating score
            const ratingHistory = await this.calculateRatingScore(user.ratingsReceived);
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
        } catch (error) {
            console.error(error)
        }
    }

    private async calculatePaymentHistoryScore(user: users): Promise<number> {
        // TODO: Implement payment history score calculation
        const payments = await prismaClient.transaction.findMany({
            where: { userId: user.id, reference: TransactionReference.RENT_PAYMENT },
            orderBy: { createdAt: 'desc' },
            take: 8, // consider the last 8 payments
        });

        if (payments.length === 0) return 0.2; //Neutral score if no payment
        console.log(`Couldnt find user used 0.2`);
        let onTimePayments = 0;
        let latePayments = 0;
        let missedPayments = 0;

        payments.forEach(payment => {
            //TODO: Note dueDatepayment for the transaction type
            const dueDate = new Date()
            const paymentDate = new Date(payment.createdAt);

            if (paymentDate <= dueDate) {
                onTimePayments += 1
            } else if (paymentDate <= new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000)) { //grace period of 30 days
                latePayments += 1
            } else {
                missedPayments += 1
            }
        })

        const score = (onTimePayments * 1 + latePayments * 0.3) / payments.length;
        return Math.min(Math.max(score, 0), 1); //ensure that the score is between 0 and 1 (Note: multiply by 100)
    }

    private async calculateRentalHistory(user: users): Promise<number> {
        try {
            const tenancies = await prismaClient.tenants.findMany({
                where: { userId: user.id },
                orderBy: { leaseStartDate: 'desc' },
            });
    
            if (tenancies.length === 0) return 0.2;
    
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
        } catch (error) {
            console.error('Error calculating rental history:', error);
            return 0.2;
        }
    }
    

    private async calculateRatingScore(ratings: Rating[]): Promise<number> {
        if (ratings.length === 0) return 0.4;

        const totalScore = ratings.reduce((sum, rating) => sum + rating.ratingValue, 0);
        const averageScore = totalScore / ratings.length;

        return averageScore / 5 //our rating scale should be 5-star rating
    }

    async updateCreditScore(userId: string): Promise<any> {
        const {
            score,
            paymentHistory,
            rentalHistory,
            maintainanceScore,
            reviewScore,
        } = await this.calculateCreditScore(userId);

        try {
            await prismaClient.creditScore.upsert({
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
        } catch (error) {
            console.log(error);
        }

        console.log(`Credit score updated for user ${userId} with score ${score}`);
    }


}

export default CreditScoreService;