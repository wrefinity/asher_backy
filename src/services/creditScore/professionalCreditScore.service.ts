import { Rating, TransactionReference, TransactionStatus, PaymentFrequency, PriceFrequency, users, tenants, Transaction, tenantPaymentHistory } from "@prisma/client";
import { prismaClient } from "../..";
import { Decimal } from "@prisma/client/runtime/library";
import logger from "../../utils/loggers";

interface CreditScoreType {
    score: number;
    paymentHistory: number;
    rentalHistory: number;
    financialBehavior: number;
    propertyCare: number;
    maintainanceScore: number;
    reviewScore: number;
    communication: number;
    bonusPoints: number;
    penaltyPoints: number;
    dataQuality: 'SUFFICIENT' | 'INSUFFICIENT' | 'EXCELLENT';
    scoreBreakdown: {
        paymentHistory: {
            score: number;
            maxScore: number;
            percentage: number;
            factors: string[];
        };
        rentalHistory: {
            score: number;
            maxScore: number;
            percentage: number;
            factors: string[];
        };
        financialBehavior: {
            score: number;
            maxScore: number;
            percentage: number;
            factors: string[];
        };
        propertyCare: {
            score: number;
            maxScore: number;
            percentage: number;
            factors: string[];
        };
        communication: {
            score: number;
            maxScore: number;
            percentage: number;
            factors: string[];
        };
    };
}

interface PaymentPeriod {
    expectedAmount: number;
    paidAmount: number;
    dueDate: Date;
    paymentDate: Date | null;
    daysLate: number;
    category: 'early' | 'on-time' | 'late-minor' | 'late-moderate' | 'late-severe' | 'very-late';
    frequency: PaymentFrequency | PriceFrequency;
    periodIndex: number;
}

class ProfessionalCreditScoreService {
    private readonly MAX_SCORE = 850;
    private readonly MIN_SCORE = 300;
    private readonly BASE_SCORE = 300;
    private readonly MIN_PAYMENT_MONTHS = 6;
    private readonly MAX_PAYMENT_MONTHS = 24;

    constructor() {}

    /**
     * Main method to calculate professional credit score
     */
    async calculateCreditScore(userId: string): Promise<CreditScoreType> {
        try {
            const user = await prismaClient.users.findUnique({
                where: { id: userId },
                include: {
                    tenants: {
                        include: {
                            property: {
                                include: {
                                    specification: {
                                        include: {
                                            residential: true,
                                            commercial: true,
                                            shortlet: true,
                                        }
                                    }
                                }
                            },
                            history: true,
                        }
                    },
                    ratingsReceived: true,
                },
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Check data quality
            const dataQuality = await this.assessDataQuality(userId, user);

            // If insufficient data, return base score
            if (dataQuality === 'INSUFFICIENT') {
                return this.getInsufficientDataScore();
            }

            // Calculate each component
            const paymentHistory = await this.calculatePaymentHistoryScore(userId, user);
            const rentalHistory = await this.calculateRentalHistoryScore(user);
            const financialBehavior = await this.calculateFinancialBehaviorScore(userId, user);
            const propertyCare = await this.calculatePropertyCareScore(userId, user);
            const communication = await this.calculateCommunicationScore(userId, user);
            const { bonusPoints, penaltyPoints } = await this.calculateBonusPenaltyPoints(userId, user);

            // Calculate final score
            let finalScore = this.BASE_SCORE;
            finalScore += paymentHistory.score;
            finalScore += rentalHistory.score;
            finalScore += financialBehavior.score;
            finalScore += propertyCare.score;
            finalScore += communication.score;
            finalScore += bonusPoints;
            finalScore -= penaltyPoints;

            // Clamp to valid range
            finalScore = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, Math.round(finalScore)));

            // Build score breakdown
            const scoreBreakdown = {
                paymentHistory: {
                    score: paymentHistory.score,
                    maxScore: 350,
                    percentage: Math.round((paymentHistory.score / 350) * 100),
                    factors: paymentHistory.factors,
                },
                rentalHistory: {
                    score: rentalHistory.score,
                    maxScore: 150,
                    percentage: Math.round((rentalHistory.score / 150) * 100),
                    factors: rentalHistory.factors,
                },
                financialBehavior: {
                    score: financialBehavior.score,
                    maxScore: 100,
                    percentage: Math.round((financialBehavior.score / 100) * 100),
                    factors: financialBehavior.factors,
                },
                propertyCare: {
                    score: propertyCare.score,
                    maxScore: 50,
                    percentage: Math.round((propertyCare.score / 50) * 100),
                    factors: propertyCare.factors,
                },
                communication: {
                    score: communication.score,
                    maxScore: 50,
                    percentage: Math.round((communication.score / 50) * 100),
                    factors: communication.factors,
                },
            };

            return {
                score: finalScore,
                paymentHistory: paymentHistory.score,
                rentalHistory: rentalHistory.score,
                maintainanceScore: propertyCare.score,
                reviewScore: 0, // Keep for backward compatibility
                financialBehavior: financialBehavior.score,
                propertyCare: propertyCare.score,
                communication: communication.score,
                bonusPoints,
                penaltyPoints,
                dataQuality,
                scoreBreakdown,
            };
        } catch (error) {
            console.error('Error calculating credit score:', error);
            throw error;
        }
    }

    /**
     * Assess data quality - determines if we have enough data to calculate accurate score
     */
    private async assessDataQuality(userId: string, user: any): Promise<'SUFFICIENT' | 'INSUFFICIENT' | 'EXCELLENT'> {
        const payments = await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: TransactionReference.RENT_PAYMENT,
                status: TransactionStatus.COMPLETED,
            },
            orderBy: { createdAt: 'desc' },
        });

        const tenancies = user.tenants || [];
        const hasCompletedTenancy = tenancies.some((t: any) => !t.isCurrentLease);
        const currentTenancyMonths = this.calculateTenancyMonths(tenancies);

        // Check payment history
        const paymentMonths = this.calculatePaymentHistoryMonths(payments);
        const hasMinimumPayments = payments.length >= 3;

        // Determine quality
        if (paymentMonths >= 12 && hasCompletedTenancy && hasMinimumPayments) {
            return 'EXCELLENT';
        } else if (paymentMonths >= this.MIN_PAYMENT_MONTHS && (hasCompletedTenancy || currentTenancyMonths >= 6) && hasMinimumPayments) {
            return 'SUFFICIENT';
        } else {
            return 'INSUFFICIENT';
        }
    }

    /**
     * Calculate payment history score (350 points - 41% weight)
     */
    private async calculatePaymentHistoryScore(userId: string, user: any): Promise<{ score: number; factors: string[] }> {
        const factors: string[] = [];
        
        // Get all rent payments with payment history
        const payments = await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: TransactionReference.RENT_PAYMENT,
                status: TransactionStatus.COMPLETED,
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Get more to handle different frequencies
        });

        if (payments.length === 0) {
            return { score: 0, factors: ['No payment history available'] };
        }

        // Get payment history records to find due dates
        const paymentHistory = await prismaClient.tenantPaymentHistory.findMany({
            where: {
                tenantId: { in: user.tenants.map((t: any) => t.id) },
            },
            orderBy: { rentStartDate: 'desc' },
        });

        // Get tenant leases to determine payment frequency
        const tenancies = await prismaClient.tenants.findMany({
            where: { userId },
            include: {
                property: {
                    include: {
                        specification: {
                            include: {
                                residential: true,
                                commercial: true,
                                shortlet: true,
                            }
                        }
                    }
                }
            }
        });

        // Build payment periods based on frequency
        const paymentPeriods = this.buildPaymentPeriods(payments, paymentHistory, tenancies);

        if (paymentPeriods.length === 0) {
            return { score: 0, factors: ['Unable to determine payment periods'] };
        }

        // Apply recency weighting and calculate score
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let onTimeCount = 0;
        let earlyCount = 0;
        let lateCount = 0;

        paymentPeriods.forEach((period, index) => {
            const recencyWeight = this.getRecencyWeight(index);
            let periodScore = 0;

            if (period.category === 'early') {
                periodScore = 1.1; // Bonus for early payment
                earlyCount++;
            } else if (period.category === 'on-time') {
                periodScore = 1.0;
                onTimeCount++;
            } else if (period.category === 'late-minor') {
                periodScore = 0.8;
                lateCount++;
            } else if (period.category === 'late-moderate') {
                periodScore = 0.6;
                lateCount++;
            } else if (period.category === 'late-severe') {
                periodScore = 0.4;
                lateCount++;
            } else if (period.category === 'very-late') {
                periodScore = 0.1;
                lateCount++;
            }

            totalWeightedScore += periodScore * recencyWeight;
            totalWeight += recencyWeight;
        });

        const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        const finalScore = Math.min(averageScore * 350, 350); // Max 350 points

        // Build factors
        factors.push(`${paymentPeriods.length} payment periods analyzed`);
        factors.push(`${onTimeCount} on-time payments`);
        if (earlyCount > 0) factors.push(`${earlyCount} early payments (bonus)`);
        if (lateCount > 0) factors.push(`${lateCount} late payments`);
        factors.push(`Recency weighting applied (recent payments weighted more)`);

        return { score: Math.round(finalScore), factors };
    }

    /**
     * Build payment periods considering different payment frequencies
     */
    private buildPaymentPeriods(
        payments: Transaction[],
        paymentHistory: tenantPaymentHistory[],
        tenancies: any[]
    ): PaymentPeriod[] {
        const periods: PaymentPeriod[] = [];
        const now = new Date();

        // Group payments by tenant and property
        for (const tenancy of tenancies) {
            const frequency = this.getPaymentFrequency(tenancy);
            const rentAmount = this.getRentAmount(tenancy);
            
            if (!tenancy.leaseStartDate || !rentAmount) continue;

            // Get payment history for this tenant
            const tenantHistory = paymentHistory.filter(h => h.tenantId === tenancy.id);
            
            // Generate expected payment periods based on frequency
            const expectedPeriods = this.generateExpectedPeriods(
                tenancy.leaseStartDate,
                tenancy.leaseEndDate || now,
                frequency,
                rentAmount,
                tenantHistory
            );

            // Match actual payments to expected periods
            const tenantPayments = payments.filter(p => 
                p.propertyId === tenancy.propertyId && 
                p.unitId === tenancy.unitId &&
                p.roomId === tenancy.roomId
            );

            for (const expectedPeriod of expectedPeriods) {
                // Find matching payment
                const matchingPayment = this.findMatchingPayment(tenantPayments, expectedPeriod);
                
                const period: PaymentPeriod = {
                    expectedAmount: expectedPeriod.expectedAmount,
                    paidAmount: matchingPayment ? Number(matchingPayment.amount) : 0,
                    dueDate: expectedPeriod.dueDate,
                    paymentDate: matchingPayment ? new Date(matchingPayment.createdAt) : null,
                    daysLate: matchingPayment 
                        ? Math.max(0, Math.floor((new Date(matchingPayment.createdAt).getTime() - expectedPeriod.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
                        : Math.max(0, Math.floor((now.getTime() - expectedPeriod.dueDate.getTime()) / (1000 * 60 * 60 * 24))),
                    category: this.categorizePayment(expectedPeriod, matchingPayment),
                    frequency,
                    periodIndex: periods.length,
                };

                periods.push(period);
            }
        }

        // Sort by due date (most recent first) and limit to last 24 months
        return periods
            .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
            .slice(0, this.getMaxPeriodsForMonths(this.MAX_PAYMENT_MONTHS));
    }

    /**
     * Generate expected payment periods based on frequency
     */
    private generateExpectedPeriods(
        startDate: Date,
        endDate: Date,
        frequency: PaymentFrequency | PriceFrequency,
        rentAmount: number,
        paymentHistory: tenantPaymentHistory[]
    ): Array<{ dueDate: Date; expectedAmount: number }> {
        const periods: Array<{ dueDate: Date; expectedAmount: number }> = [];
        const frequencyMs = this.getFrequencyMilliseconds(frequency);
        let currentDate = new Date(startDate);

        // Use payment history if available (more accurate)
        if (paymentHistory.length > 0) {
            for (const history of paymentHistory) {
                if (history.rentStartDate && history.rentEndDate) {
                    periods.push({
                        dueDate: new Date(history.rentEndDate), // Due date is typically the end of the period
                        expectedAmount: history.expectedRentAmount ? Number(history.expectedRentAmount) : rentAmount,
                    });
                }
            }
            return periods.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
        }

        // Generate periods based on frequency
        while (currentDate < endDate) {
            const nextDate = new Date(currentDate.getTime() + frequencyMs);
            if (nextDate > endDate) break;

            periods.push({
                dueDate: new Date(nextDate),
                expectedAmount: rentAmount,
            });

            currentDate = nextDate;
        }

        return periods;
    }

    /**
     * Get payment frequency from tenancy
     */
    private getPaymentFrequency(tenancy: any): PaymentFrequency | PriceFrequency {
        // Try to get from property priceFrequency
        if (tenancy.property?.priceFrequency) {
            return tenancy.property.priceFrequency as PriceFrequency;
        }
        
        // Try to get from specification
        const spec = tenancy.property?.specification?.find((s: any) => s.isActive);
        if (spec?.residential) {
            // Residential properties typically monthly
            return 'MONTHLY' as PaymentFrequency;
        }
        
        // Default to monthly
        return 'MONTHLY' as PaymentFrequency;
    }

    /**
     * Get rent amount from tenancy
     */
    private getRentAmount(tenancy: any): number {
        // Try property price
        if (tenancy.property?.price) {
            return Number(tenancy.property.price);
        }
        
        // Try unit configuration
        if (tenancy.unitId) {
            const unit = tenancy.property?.specification
                ?.find((s: any) => s.isActive)
                ?.residential?.unitConfigurations
                ?.find((u: any) => u.id === tenancy.unitId);
            if (unit?.price) {
                return Number(unit.price);
            }
        }
        
        return 0;
    }

    /**
     * Get frequency in milliseconds
     */
    private getFrequencyMilliseconds(frequency: PaymentFrequency | PriceFrequency): number {
        const configs: Record<PaymentFrequency | PriceFrequency, number> = {
            DAILY: 24 * 60 * 60 * 1000,
            WEEKLY: 7 * 24 * 60 * 60 * 1000,
            MONTHLY: 30 * 24 * 60 * 60 * 1000,
            QUARTERLY: 90 * 24 * 60 * 60 * 1000,
            ANNUALLY: 365 * 24 * 60 * 60 * 1000,
            YEARLY: 365 * 24 * 60 * 60 * 1000,
            PER_SQFT: 30 * 24 * 60 * 60 * 1000, // Default to monthly
        };
        return configs[frequency] || configs.MONTHLY;
    }

    /**
     * Find matching payment for a period
     */
    private findMatchingPayment(payments: Transaction[], period: { dueDate: Date; expectedAmount: number }): Transaction | null {
        // Find payment within 7 days of due date (before or after)
        const toleranceMs = 7 * 24 * 60 * 60 * 1000;
        
        return payments.find(p => {
            const paymentDate = new Date(p.createdAt);
            const timeDiff = Math.abs(paymentDate.getTime() - period.dueDate.getTime());
            const amountMatch = Math.abs(Number(p.amount) - period.expectedAmount) < period.expectedAmount * 0.1; // 10% tolerance
            
            return timeDiff <= toleranceMs && amountMatch;
        }) || null;
    }

    /**
     * Categorize payment based on timing and amount
     */
    private categorizePayment(
        expectedPeriod: { dueDate: Date; expectedAmount: number },
        payment: Transaction | null
    ): 'early' | 'on-time' | 'late-minor' | 'late-moderate' | 'late-severe' | 'very-late' {
        if (!payment) {
            const daysOverdue = Math.floor((Date.now() - expectedPeriod.dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue > 30) return 'very-late';
            if (daysOverdue > 14) return 'late-severe';
            if (daysOverdue > 7) return 'late-moderate';
            return 'late-minor';
        }

        const paymentDate = new Date(payment.createdAt);
        const daysDiff = Math.floor((paymentDate.getTime() - expectedPeriod.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const paidAmount = Number(payment.amount);
        const expectedAmount = expectedPeriod.expectedAmount;
        const isFullPayment = paidAmount >= expectedAmount * 0.95; // 95% threshold

        if (!isFullPayment) {
            return 'very-late'; // Partial payment treated as very late
        }

        if (daysDiff < 0) {
            return 'early'; // Paid before due date
        } else if (daysDiff === 0) {
            return 'on-time';
        } else if (daysDiff <= 7) {
            return 'late-minor';
        } else if (daysDiff <= 14) {
            return 'late-moderate';
        } else if (daysDiff <= 30) {
            return 'late-severe';
        } else {
            return 'very-late';
        }
    }

    /**
     * Get recency weight (exponential decay)
     */
    private getRecencyWeight(index: number): number {
        return Math.pow(0.95, index); // Most recent = 1.0, older = less weight
    }

    /**
     * Calculate rental history score (150 points - 18% weight)
     */
    private async calculateRentalHistoryScore(user: any): Promise<{ score: number; factors: string[] }> {
        const factors: string[] = [];
        const tenancies = user.tenants || [];

        if (tenancies.length === 0) {
            return { score: 0, factors: ['No rental history'] };
        }

        const now = new Date();
        let totalDuration = 0;
        let completedTenancies = 0;
        let onTimePaidTenancies = 0;
        let renewals = 0;
        let earlyTerminations = 0;

        // Get lease renewals
        const leaseRenewals = await prismaClient.leaseRenewal.findMany({
            where: {
                tenantId: { in: tenancies.map((t: any) => t.id) },
                status: 'ACCEPTED',
            },
        });
        renewals = leaseRenewals.length;

        tenancies.forEach((tenancy: any) => {
            if (!tenancy.leaseStartDate) return;

            const startDate = new Date(tenancy.leaseStartDate);
            const endDate = tenancy.isCurrentLease 
                ? now 
                : (tenancy.leaseEndDate ? new Date(tenancy.leaseEndDate) : now);
            
            const durationMonths = (endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
            totalDuration += durationMonths;

            if (!tenancy.isCurrentLease) {
                completedTenancies++;
                if (tenancy.rentstatus === 1) {
                    onTimePaidTenancies++;
                }
                
                // Check for early termination (ended before expected end date)
                if (tenancy.leaseEndDate) {
                    const expectedEnd = new Date(tenancy.leaseEndDate);
                    if (endDate < expectedEnd) {
                        earlyTerminations++;
                    }
                }
            }
        });

        const averageDurationMonths = totalDuration / tenancies.length;
        const durationScore = Math.min(averageDurationMonths / 24, 1.0); // Max 24 months = 1.0
        const completionScore = completedTenancies / tenancies.length;
        const onTimePaymentRate = completedTenancies > 0 ? onTimePaidTenancies / completedTenancies : 0;
        const renewalRate = tenancies.length > 1 ? renewals / (tenancies.length - 1) : 0;
        const stabilityScore = Math.max(0, 1 - (earlyTerminations / tenancies.length));

        const finalScore = (
            durationScore * 0.25 +
            completionScore * 0.25 +
            onTimePaymentRate * 0.20 +
            renewalRate * 0.15 +
            stabilityScore * 0.15
        ) * 150;

        // Build factors
        factors.push(`${tenancies.length} tenancy(ies) total`);
        factors.push(`${completedTenancies} completed tenancy(ies)`);
        factors.push(`Average duration: ${Math.round(averageDurationMonths)} months`);
        if (renewals > 0) factors.push(`${renewals} lease renewal(s)`);
        if (earlyTerminations > 0) factors.push(`${earlyTerminations} early termination(s)`);

        return { score: Math.round(finalScore), factors };
    }

    /**
     * Calculate financial behavior score (100 points - 12% weight)
     */
    private async calculateFinancialBehaviorScore(userId: string, user: any): Promise<{ score: number; factors: string[] }> {
        const factors: string[] = [];
        
        // Get all financial obligations (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const transactions = await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: {
                    in: [
                        TransactionReference.RENT_PAYMENT,
                        TransactionReference.BILL_PAYMENT,
                        TransactionReference.MAINTENANCE_FEE,
                        TransactionReference.LATE_FEE,
                    ],
                },
                createdAt: { gte: twelveMonthsAgo },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (transactions.length === 0) {
            return { score: 50, factors: ['Insufficient financial data'] }; // Neutral score
        }

        const rentPayments = transactions.filter(t => t.reference === TransactionReference.RENT_PAYMENT);
        const billPayments = transactions.filter(t => t.reference === TransactionReference.BILL_PAYMENT);
        const maintenanceFees = transactions.filter(t => t.reference === TransactionReference.MAINTENANCE_FEE);
        const lateFees = transactions.filter(t => t.reference === TransactionReference.LATE_FEE);

        const totalObligations = transactions
            .filter(t => t.reference !== TransactionReference.LATE_FEE)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalPaid = transactions
            .filter(t => t.status === TransactionStatus.COMPLETED && t.reference !== TransactionReference.LATE_FEE)
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const onTimePayments = transactions.filter(t => 
            t.status === TransactionStatus.COMPLETED && 
            !t.isDue &&
            t.reference !== TransactionReference.LATE_FEE
        ).length;

        const paymentCompleteness = totalObligations > 0 ? totalPaid / totalObligations : 1.0;
        const onTimeRate = transactions.length > 0 ? onTimePayments / transactions.length : 1.0;
        const lateFeePenalty = Math.max(0, 1 - (lateFees.length * 0.1)); // Each late fee = -10%

        // Check payment method consistency
        const paymentMethods = new Set(transactions.map(t => t.paymentGateway).filter(Boolean));
        const consistencyBonus = paymentMethods.size === 1 ? 0.05 : 0;

        const finalScore = (
            paymentCompleteness * 0.35 +
            onTimeRate * 0.30 +
            lateFeePenalty * 0.20 +
            consistencyBonus
        ) * 100;

        // Build factors
        factors.push(`${transactions.length} financial transactions in last 12 months`);
        factors.push(`Payment completeness: ${Math.round(paymentCompleteness * 100)}%`);
        factors.push(`On-time rate: ${Math.round(onTimeRate * 100)}%`);
        if (lateFees.length > 0) factors.push(`${lateFees.length} late fee(s) incurred`);
        if (consistencyBonus > 0) factors.push('Consistent payment method (bonus)');

        return { score: Math.round(Math.min(finalScore, 100)), factors };
    }

    /**
     * Calculate property care score (50 points - 6% weight)
     */
    private async calculatePropertyCareScore(userId: string, user: any): Promise<{ score: number; factors: string[] }> {
        const factors: string[] = [];
        
        const tenantIds = user.tenants?.map((t: any) => t.id) || [];
        
        if (tenantIds.length === 0) {
            return { score: 25, factors: ['No tenant records'] }; // Neutral score
        }

        // Get maintenance requests
        const maintenanceRequests = await prismaClient.maintenance.findMany({
            where: {
                tenantId: { in: tenantIds },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get inspections
        const inspections = await prismaClient.inspection.findMany({
            where: {
                tenantId: { in: tenantIds },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate tenancy months
        const tenancyMonths = this.calculateTenancyMonths(user.tenants);
        const maintenanceFrequency = tenancyMonths > 0 ? maintenanceRequests.length / tenancyMonths : 0;
        
        // Count tenant-caused maintenance (simplified - would need better categorization)
        const tenantCausedMaintenance = maintenanceRequests.filter(m => 
            m.description?.toLowerCase().includes('damage') ||
            m.description?.toLowerCase().includes('broken') ||
            m.description?.toLowerCase().includes('misuse')
        ).length;

        // Calculate average inspection score (if available)
        const inspectionScores = inspections
            .map(i => (i as any).overallScore || (i as any).rating)
            .filter((s: any) => s && s > 0);
        const averageInspectionScore = inspectionScores.length > 0
            ? inspectionScores.reduce((a: number, b: number) => a + b, 0) / inspectionScores.length
            : 4.0; // Default to good if no inspections

        const frequencyScore = Math.max(0, 1 - (maintenanceFrequency / 2)); // Max 2 per year = 0
        const causeScore = maintenanceRequests.length > 0 
            ? 1 - (tenantCausedMaintenance / maintenanceRequests.length)
            : 1.0;
        const inspectionScore = averageInspectionScore / 5; // Normalize to 0-1

        const finalScore = (
            frequencyScore * 0.30 +
            causeScore * 0.25 +
            inspectionScore * 0.25 +
            0.20 // Default for damage/response (would need more data)
        ) * 50;

        // Build factors
        factors.push(`${maintenanceRequests.length} maintenance request(s)`);
        factors.push(`Maintenance frequency: ${maintenanceFrequency.toFixed(2)} per month`);
        if (inspections.length > 0) {
            factors.push(`Average inspection score: ${averageInspectionScore.toFixed(1)}/5`);
        }
        if (tenantCausedMaintenance > 0) {
            factors.push(`${tenantCausedMaintenance} tenant-caused maintenance issue(s)`);
        }

        return { score: Math.round(Math.min(finalScore, 50)), factors };
    }

    /**
     * Calculate communication score (50 points - 6% weight)
     */
    private async calculateCommunicationScore(userId: string, user: any): Promise<{ score: number; factors: string[] }> {
        const factors: string[] = [];
        
        // Get messages (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const messages = await prismaClient.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
                createdAt: { gte: sixMonthsAgo },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        if (messages.length === 0) {
            return { score: 25, factors: ['No communication data'] }; // Neutral score
        }

        // Calculate response times (simplified - would need thread analysis)
        const userMessages = messages.filter(m => m.senderId === userId);
        const responseTimes: number[] = [];
        
        // Group by chat room and calculate response times
        const chatRooms = new Map<string, any[]>();
        messages.forEach(m => {
            if (!chatRooms.has(m.chatRoomId)) {
                chatRooms.set(m.chatRoomId, []);
            }
            chatRooms.get(m.chatRoomId)!.push(m);
        });

        chatRooms.forEach((roomMessages, roomId) => {
            roomMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            
            for (let i = 1; i < roomMessages.length; i++) {
                const prev = roomMessages[i - 1];
                const curr = roomMessages[i];
                
                // If previous was not from user and current is from user, calculate response time
                if (prev.senderId !== userId && curr.senderId === userId) {
                    const hours = (curr.createdAt.getTime() - prev.createdAt.getTime()) / (1000 * 60 * 60);
                    if (hours < 168) { // Within a week
                        responseTimes.push(hours);
                    }
                }
            }
        });

        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 48; // Default 48 hours

        const responseTimeScore = avgResponseTime < 24 ? 1.0 :
                                 avgResponseTime < 48 ? 0.8 : 0.6;
        
        const responseRate = userMessages.length / messages.length;
        const toneScore = 0.8; // Would need NLP for actual tone analysis

        const finalScore = (
            responseTimeScore * 0.30 +
            responseRate * 0.25 +
            toneScore * 0.20 +
            0.25 // Default for other factors
        ) * 50;

        // Build factors
        factors.push(`${messages.length} messages in last 6 months`);
        factors.push(`Average response time: ${Math.round(avgResponseTime)} hours`);
        factors.push(`Response rate: ${Math.round(responseRate * 100)}%`);

        return { score: Math.round(Math.min(finalScore, 50)), factors };
    }

    /**
     * Calculate bonus and penalty points
     */
    private async calculateBonusPenaltyPoints(userId: string, user: any): Promise<{ bonusPoints: number; penaltyPoints: number }> {
        let bonusPoints = 0;
        let penaltyPoints = 0;

        // Check employment stability (if available in user data)
        // This would need to be implemented based on your employment data structure

        // Check for guarantor
        const tenancies = user.tenants || [];
        const tenantIds = tenancies.map((t: any) => t.id);
        const hasGuarantor = tenancies.some((t: any) => 
            t.guarantorInfo && Object.keys(t.guarantorInfo).length > 0
        );
        if (hasGuarantor) bonusPoints += 5;

        // Check for long tenancy
        const currentTenancy = tenancies.find((t: any) => t.isCurrentLease);
        if (currentTenancy && currentTenancy.leaseStartDate) {
            const months = (Date.now() - new Date(currentTenancy.leaseStartDate).getTime()) / (30 * 24 * 60 * 60 * 1000);
            if (months > 24) bonusPoints += 15;
        }

        // Check for outstanding debt
        const outstandingDebt = await this.calculateOutstandingDebt(userId);
        if (outstandingDebt > 1000) penaltyPoints += 30;

        // Check for lease breaches
        if (tenantIds.length > 0) {
            const breaches = await prismaClient.tenantLeaseBreach.findMany({
                where: {
                    tenantId: { in: tenantIds },
                },
            });
            penaltyPoints += breaches.length * 40;
        }

        // Check for early terminations
        const earlyTerminations = tenancies.filter((t: any) => {
            if (t.isCurrentLease || !t.leaseEndDate || !t.leaseStartDate) return false;
            const endDate = new Date(t.leaseEndDate);
            const startDate = new Date(t.leaseStartDate);
            const expectedDuration = (endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
            return expectedDuration < 12; // Less than 12 months
        }).length;
        penaltyPoints += earlyTerminations * 30;

        return { bonusPoints, penaltyPoints };
    }

    /**
     * Calculate outstanding debt
     */
    private async calculateOutstandingDebt(userId: string): Promise<number> {
        // This would need to calculate based on unpaid bills, rent, etc.
        // Simplified for now
        const unpaidTransactions = await prismaClient.transaction.findMany({
            where: {
                userId,
                status: TransactionStatus.PENDING,
                type: 'DEBIT',
            },
        });

        return unpaidTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    /**
     * Helper methods
     */
    private calculateTenancyMonths(tenancies: any[]): number {
        if (!tenancies || tenancies.length === 0) return 0;
        
        const now = new Date();
        return tenancies.reduce((total, t) => {
            if (!t.leaseStartDate) return total;
            const start = new Date(t.leaseStartDate);
            const end = t.isCurrentLease ? now : (t.leaseEndDate ? new Date(t.leaseEndDate) : now);
            const months = (end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000);
            return total + months;
        }, 0);
    }

    private calculatePaymentHistoryMonths(payments: Transaction[]): number {
        if (payments.length === 0) return 0;
        const oldest = payments[payments.length - 1];
        const newest = payments[0];
        return (new Date(newest.createdAt).getTime() - new Date(oldest.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000);
    }

    private getMaxPeriodsForMonths(months: number): number {
        // Estimate max periods based on monthly frequency (conservative)
        return months * 4; // Assume weekly payments max
    }

    private getInsufficientDataScore(): CreditScoreType {
        return {
            score: 400, // Below average for insufficient data
            paymentHistory: 0,
            reviewScore: 0,
            rentalHistory: 0,
            maintainanceScore: 0,
            financialBehavior: 0,
            propertyCare: 0,
            communication: 0,
            bonusPoints: 0,
            penaltyPoints: 0,
            dataQuality: 'INSUFFICIENT',
            scoreBreakdown: {
                paymentHistory: {
                    score: 0,
                    maxScore: 350,
                    percentage: 0,
                    factors: ['Insufficient payment history (minimum 6 months required)'],
                },
                rentalHistory: {
                    score: 0,
                    maxScore: 150,
                    percentage: 0,
                    factors: ['Insufficient rental history'],
                },
                financialBehavior: {
                    score: 0,
                    maxScore: 100,
                    percentage: 0,
                    factors: ['Insufficient financial data'],
                },
                propertyCare: {
                    score: 0,
                    maxScore: 50,
                    percentage: 0,
                    factors: ['Insufficient property care data'],
                },
                communication: {
                    score: 0,
                    maxScore: 50,
                    percentage: 0,
                    factors: ['Insufficient communication data'],
                },
            },
        };
    }

    /**
     * Update credit score in database
     */
    async updateCreditScore(userId: string): Promise<any> {
        const creditScoreData = await this.calculateCreditScore(userId);

        try {
            await prismaClient.creditScore.upsert({
                where: { userId },
                update: {
                    score: creditScoreData.score,
                    paymentHistory: creditScoreData.paymentHistory,
                    rentalHistory: creditScoreData.rentalHistory,
                    maintainanceScore: creditScoreData.propertyCare,
                    reviewScore: 0,
                    financialBehavior: creditScoreData.financialBehavior,
                    propertyCare: creditScoreData.propertyCare,
                    communication: creditScoreData.communication,
                    bonusPoints: creditScoreData.bonusPoints,
                    penaltyPoints: creditScoreData.penaltyPoints,
                    dataQuality: creditScoreData.dataQuality,
                    scoreBreakdown: creditScoreData.scoreBreakdown as any,
                    lastUpdated: new Date(),
                },
                create: {
                    userId,
                    score: creditScoreData.score,
                    paymentHistory: creditScoreData.paymentHistory,
                    rentalHistory: creditScoreData.rentalHistory,
                    maintainanceScore: creditScoreData.propertyCare,
                    reviewScore: 0,
                    financialBehavior: creditScoreData.financialBehavior,
                    propertyCare: creditScoreData.propertyCare,
                    communication: creditScoreData.communication,
                    bonusPoints: creditScoreData.bonusPoints,
                    penaltyPoints: creditScoreData.penaltyPoints,
                    dataQuality: creditScoreData.dataQuality,
                    scoreBreakdown: creditScoreData.scoreBreakdown as any,
                },
            });

            logger.info(`Professional credit score updated for user ${userId}: ${creditScoreData.score}`);
            return creditScoreData;
        } catch (error) {
            logger.error('Error updating credit score:', error);
            throw error;
        }
    }
}

export default ProfessionalCreditScoreService;