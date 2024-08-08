import { PropertyTransactionsType, Rating, TransactionType, users } from "@prisma/client"
import { prismaClient } from "../.."



class CreditScoreService {
    private readonly MAX_SCORE = 900
    private readonly MIN_SCORE = 100

    constructor() {
        
    }

    async calculateCreditScore(userId: string): Promise<number> {
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: {
                tenant: true,
                landlords: true,
                ratingsReceived: true,
            },
        })

        if (!user) {
            throw new Error('User not found')
        }

        let score = 250

        // claculate based of payment history
        const paymentHistory = await this.calculatePaymentHistoryScore(user)
        score += paymentHistory * 100

        //calculate based on rent history
        const rentHistory = await this.calculateRentalHistory(user)
        score += rentHistory * 50

        // calculate based on rating score
        const ratingHistory = await this.calculateRatingScore(user.ratingsReceived)
        score += ratingHistory * 20

        return Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, Math.round(score)));
    }

    private async calculatePaymentHistoryScore(user: users): Promise<number> {
        // TODO: Implement payment history score calculation
        const payments = await prismaClient.propertyTransactions.findMany({
            where: { tenantId: user.id, type: PropertyTransactionsType.RENT_PAYMENT },
            orderBy: { createdAt: 'desc' },
            take: 8, // consider the last 8 payments
        });

        if (payments.length === 0) return 0.2; //Neutral score if no payment

        let onTimePayments = 0;
        let latePayments = 0;
        let missedPayments = 0;

        payments.forEach(payment => {
            const dueDate = new Date(payment.dueDate)
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
        const tenancies = await prismaClient.tenants.findMany({
            where: { userId: user.id },
            orderBy: { leaseStartDate: 'desc' },
        });

        if (tenancies.length === 0) return 0.2; //Neutral score if no tenancy

        const currentDate = new Date();
        let totalDuration = 0;
        let completedTenancies = 0;
        let onTImePaidTenancies = 0;

        tenancies.forEach(tenancy => {
            const startDate = tenancy.leaseStartDate;
            const endDate = tenancy.isCurrentLease ? currentDate : (tenancy.leaseEndDate || currentDate);

            totalDuration += (endDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000) // in yrs

            if (!tenancy.isCurrentLease) {
                completedTenancies += 1;
                if (tenancy.rentstatus === 1) {
                    onTImePaidTenancies += 1;
                }
            }
        })

        const averageDuration = totalDuration / tenancies.length;
        const averageCompletionRate = completedTenancies / tenancies.length;
        const averageOnTimePaymentRate = onTImePaidTenancies / completedTenancies;

        const durationScore = Math.min(averageDuration / 2, 1)
        const score = (durationScore * 0.3) + (averageCompletionRate * 0.2) + (averageOnTimePaymentRate * 0.3);

        return Math.min(Math.max(score, 0), 1); //ensure that the score is between 0 and 1 (Note: multiply by 100)
    }

    private async calculateRatingScore(ratings: Rating[]): Promise<number> {
        if (ratings.length === 0) return 0.4;

        const totalScore = ratings.reduce((sum, rating) => sum + rating.ratingValue, 0);
        const averageScore = totalScore / ratings.length;

        return averageScore / 5 //our rating scale should be 5-star rating
    }

    async updateCreditScore(userId: string): Promise<void> {
        const score = await this.calculateCreditScore(userId);
        await prismaClient.creditScore.upsert({
            where: { userId },
            update: { score, lastUpdated: new Date() },
            create: { userId, score } as any,
        });
    }

}

export default CreditScoreService;