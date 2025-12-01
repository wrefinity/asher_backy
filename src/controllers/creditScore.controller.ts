import { Response } from "express";
import { CustomRequest } from "../utils/types";
import ErrorService from "../services/error.service";
import ProfessionalCreditScoreService from "../services/creditScore/professionalCreditScore.service";

class CreditScoreController {
    private creditScoreService: ProfessionalCreditScoreService;

    constructor() {
        this.creditScoreService = new ProfessionalCreditScoreService();
    }

    /**
     * Get credit score for a user
     */
    getCreditScore = async (req: CustomRequest, res: Response) => {
        try {
            // If userId param exists, use it; otherwise use authenticated user's ID
            const userId = req.params.userId || req.user?.id;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User ID is required" 
                });
            }

            // Check if user is requesting their own score or is authorized landlord
            if (req.user?.id !== userId && !req.user?.landlords?.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Unauthorized to view this credit score" 
                });
            }

            const creditScore = await this.creditScoreService.calculateCreditScore(userId);

            return res.status(200).json({
                success: true,
                data: creditScore,
            });
        } catch (error: any) {
            console.error('Error getting credit score:', error);
            ErrorService.handleError(error, res);
        }
    };

    /**
     * Update/Recalculate credit score for a user
     */
    updateCreditScore = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.params.userId || req.user?.id;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User ID is required" 
                });
            }

            // Check authorization
            if (req.user?.id !== userId && !req.user?.landlords?.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Unauthorized to update this credit score" 
                });
            }

            const creditScore = await this.creditScoreService.updateCreditScore(userId);

            return res.status(200).json({
                success: true,
                message: "Credit score updated successfully",
                data: creditScore,
            });
        } catch (error: any) {
            console.error('Error updating credit score:', error);
            ErrorService.handleError(error, res);
        }
    };

    /**
     * Get credit score breakdown (detailed explanation)
     */
    getCreditScoreBreakdown = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.params.userId || req.user?.id;

            if (!userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: "User ID is required" 
                });
            }

            // Check authorization
            if (req.user?.id !== userId && !req.user?.landlords?.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Unauthorized to view this credit score" 
                });
            }

            const creditScore = await this.creditScoreService.calculateCreditScore(userId);

            return res.status(200).json({
                success: true,
                data: {
                    score: creditScore.score,
                    scoreBreakdown: creditScore.scoreBreakdown,
                    dataQuality: creditScore.dataQuality,
                    bonusPoints: creditScore.bonusPoints,
                    penaltyPoints: creditScore.penaltyPoints,
                    interpretation: this.interpretScore(creditScore.score),
                    improvementSuggestions: this.getImprovementSuggestions(creditScore),
                },
            });
        } catch (error: any) {
            console.error('Error getting credit score breakdown:', error);
            ErrorService.handleError(error, res);
        }
    };

    /**
     * Interpret score into category
     */
    private interpretScore(score: number): string {
        if (score >= 800) return 'Excellent - Exceptional tenant';
        if (score >= 740) return 'Very Good - Highly reliable tenant';
        if (score >= 670) return 'Good - Reliable tenant';
        if (score >= 580) return 'Fair - Moderate risk, may require additional deposit';
        return 'Poor - High risk tenant';
    }

    /**
     * Get improvement suggestions based on score breakdown
     */
    private getImprovementSuggestions(creditScore: any): string[] {
        const suggestions: string[] = [];

        // Payment history suggestions
        if (creditScore.scoreBreakdown.paymentHistory.percentage < 80) {
            suggestions.push('Pay rent on time consistently to improve your payment history score');
            if (creditScore.scoreBreakdown.paymentHistory.percentage < 50) {
                suggestions.push('Consider setting up automatic payments to avoid late payments');
            }
        } else if (creditScore.scoreBreakdown.paymentHistory.percentage >= 95) {
            suggestions.push('Great payment history! Consider paying a few days early for bonus points');
        }

        // Rental stability suggestions
        if (creditScore.scoreBreakdown.rentalHistory.percentage < 70) {
            suggestions.push('Complete your current tenancy to improve stability score');
            if (creditScore.scoreBreakdown.rentalHistory.factors.some((f: string) => f.includes('early termination'))) {
                suggestions.push('Avoid early lease terminations to improve your rental history');
            }
        }

        // Financial behavior suggestions
        if (creditScore.scoreBreakdown.financialBehavior.percentage < 70) {
            suggestions.push('Pay all bills on time to improve financial behavior score');
            if (creditScore.scoreBreakdown.financialBehavior.factors.some((f: string) => f.includes('late fee'))) {
                suggestions.push('Avoid late fees by paying bills before due dates');
            }
        }

        // Property care suggestions
        if (creditScore.scoreBreakdown.propertyCare.percentage < 60) {
            suggestions.push('Reduce maintenance requests and take better care of the property');
        }

        // Communication suggestions
        if (creditScore.scoreBreakdown.communication.percentage < 70) {
            suggestions.push('Respond to messages within 24 hours to improve communication score');
        }

        // General suggestions
        if (creditScore.penaltyPoints > 0) {
            suggestions.push('Address any outstanding issues to remove penalty points');
        }

        if (suggestions.length === 0) {
            suggestions.push('Keep up the excellent work! Your credit score is in great shape.');
        }

        return suggestions;
    }
}

export default new CreditScoreController();

