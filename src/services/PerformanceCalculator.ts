import { Decimal } from "@prisma/client/runtime/library";
import { prismaClient } from "..";
import { maintenanceStatus, TransactionReference, SeverityLevel, TransactionStatus, PaymentFrequency, inspection } from '@prisma/client';

class PerformanceCalculator {

    private async calculateRentPaymentScore(userId: string): Promise<number> {
        const payments = await prismaClient.transaction.findMany({
            where: {
                userId,
                reference: TransactionReference.RENT_PAYMENT
            },
            orderBy: {
                createdAt: 'desc'
            },
            // take: 12 // Last 12 months
        });

        if (payments.length === 0) return 100; // No payments = perfect score

        const onTimePayments = payments.filter(p =>
            p.status === TransactionStatus.COMPLETED &&
            !p.isDue
        ).length;

        return Math.round((onTimePayments / payments.length) * 100);
    }
    private async calculateTenancyStability(userId: string): Promise<number> {
        const tenancies = await prismaClient.tenants.findMany({
            where: { userId, isCurrentLease: true },
            orderBy: { leaseStartDate: 'asc' },
            include: {
                property: true
            }
        });
        if (tenancies.length <= 1) return 100;
        const currentTenancy = tenancies.find(t => t.isCurrentLease);
        const previousTenancies = tenancies.filter(t => !t.isCurrentLease);

        // Calculate average tenancy duration in months
        const totalDuration = previousTenancies.reduce((sum, tenancy) => {
            const endDate = tenancy.leaseEndDate || new Date(); // Use current date if no end date
            return sum + this.monthDiff(tenancy.leaseStartDate, endDate);
        }, 0);
        const avgDuration = totalDuration / previousTenancies.length;

        // Calculate time between tenancies (gap months)
        let totalGap = 0;
        for (let i = 1; i < tenancies.length; i++) {
            const prevEnd = tenancies[i - 1].leaseEndDate || tenancies[i].leaseStartDate;
            totalGap += this.monthDiff(prevEnd, tenancies[i].leaseStartDate);
        }
        const avgGap = totalGap / (tenancies.length - 1);

        // Calculate landlord diversity
        const landlordIds = new Set(previousTenancies.map(t => t.property.landlordId));
        const landlordChanges = landlordIds.size;

        // Weighted scoring
        const durationScore = Math.min(100, avgDuration * 10); // 10 points per month avg duration
        const gapScore = Math.max(0, 100 - (avgGap * 5)); // Deduct 5 points per month between tenancies
        const diversityScore = Math.max(0, 100 - (landlordChanges * 10)); // Deduct 10 per landlord change

        // Composite score with weights
        return Math.round(
            (durationScore * 0.5) + // Duration most important
            (gapScore * 0.3) +      // Gaps between tenancies
            (diversityScore * 0.2)  // Landlord changes
        );
    }
    private async calculateRentToIncomeRatio(userId: string): Promise<number> {
        const tenant = await prismaClient.tenants.findUnique({
            where: { userId },
            include: {
                user: {
                    include: {
                        EmploymentInformation: {
                            take: 1
                        }
                    }
                },
                property: true
            }
        });
        // Default score if missing data
        if (!tenant || !tenant.property || !tenant.user.EmploymentInformation[0]) {
            return 85; // Midpoint of your range
        }
        const monthlyRent = Number(tenant.property.price);
        const monthlyIncome = Number(tenant.user.EmploymentInformation[0].monthlyOrAnualIncome);

        // Handle invalid income
        if (monthlyIncome <= 0) return 50;
        const ratio = monthlyRent / monthlyIncome;

        // Exact scoring per your requirements
        if (ratio <= 0.3) return 100;
        if (ratio <= 0.4) return 85; // Midpoint of 80-90 range
        return 40;
    }
    private async calculateUtilityCompliance(userId: string): Promise<number> {
        // Get ALL tenancies for this user
        const tenancies = await prismaClient.tenants.findMany({
            where: { userId },
            include: {
                property: true,
                billsSubCategory: {
                    // where: { billCategory: 'UTILITY' },
                    include: {
                        transactions: {
                            where: { status: TransactionStatus.COMPLETED },
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: { dueDate: 'asc' }
                }
            },
            orderBy: { leaseStartDate: 'asc' }
        });

        if (tenancies.length === 0) return 75;

        // Calculate metrics across all tenancies
        let totalUtilityBills = 0;
        let paidUtilityBills = 0;
        let totalDaysLate = 0;
        const frequencyGroups: Record<PaymentFrequency, number> = {
            DAILY: 0,
            WEEKLY: 0,
            MONTHLY: 0,
            YEARLY: 0,
            QUARTERLY: 0,
            ANNUALLY: 0,
            PER_SQFT: 0,
        };
        let totalTenancyDuration = 0;

        tenancies.forEach(tenancy => {
            // Calculate tenancy duration in months
            const tenancyDuration = tenancy.leaseEndDate
                ? this.monthDiff(tenancy.leaseStartDate, tenancy.leaseEndDate)
                : this.monthDiff(tenancy.leaseStartDate, new Date());

            totalTenancyDuration += tenancyDuration;

            // Process utility bills for this tenancy
            tenancy.billsSubCategory.forEach(bill => {
                totalUtilityBills++;

                // Count paid bills
                if (bill.transactions.length > 0) {
                    paidUtilityBills++;

                    // Calculate days late for timeliness
                    const payment = bill.transactions[0];
                    const daysLate = Math.max(0,
                        (payment.createdAt.getTime() - bill.dueDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    totalDaysLate += Math.min(daysLate, 30); // Cap at 30 days
                }

                // Track payment frequencies
                frequencyGroups[bill.billFrequency]++;
            });
        });

        if (totalUtilityBills === 0) return 100; // Perfect score if no utility bills

        // 1. Basic Payment Compliance (40% weight)
        const paymentCompliance = (paidUtilityBills / totalUtilityBills) * 100;

        // 2. Frequency Adaptation Score (30% weight)
        const frequencyScore = this.calculateFrequencyAdaptation(
            frequencyGroups,
            tenancies[0]?.property?.priceFrequency // Use first property's frequency as reference
        );

        // 3. Timeliness Score (20% weight)
        const avgDaysLate = paidUtilityBills > 0 ? totalDaysLate / paidUtilityBills : 0;
        const timelinessScore = Math.max(0, 100 - (avgDaysLate * 5)); // 5 points per day late

        // 4. Duration Adjustment (10% weight)
        const avgTenancyDuration = totalTenancyDuration / tenancies.length;
        const durationScore = Math.min(100, 70 + (avgTenancyDuration * 2)); // +2 points per month

        // Weighted composite score
        return Math.round(
            (paymentCompliance * 0.4) +
            (frequencyScore * 0.3) +
            (timelinessScore * 0.2) +
            (durationScore * 0.1)
        );
    }
    private async calculateOverdueScore(userId: string): Promise<number> {
        const GRACE_PERIOD_DAYS = 14;
        const now = new Date();

        // Fetch all tenant records for this user
        const allTenancies = await prismaClient.tenants.findMany({
            where: { userId },
            include: {
                billsSubCategory: {
                    include: {
                        transactions: {
                            where: {
                                userId,
                                status: TransactionStatus.COMPLETED,
                                reference: TransactionReference.BILL_PAYMENT
                            },
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: { dueDate: 'desc' }
                },
                property: true,
                history: true,
                user: {
                    include: {
                        transactions: {
                            where: {
                                status: TransactionStatus.COMPLETED,
                                reference: {
                                    in: [
                                        TransactionReference.RENT_PAYMENT,
                                        TransactionReference.LATE_FEE
                                    ]
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                }
            },
            orderBy: { leaseStartDate: 'desc' }
        });

        if (allTenancies.length === 0) return 75; // Default score if no tenant data

        let totalDebt = new Decimal(0);
        let totalObligations = new Decimal(0);
        let maxDaysLate = 0;
        let hasCompleteNonPayment = false;



        // Process each tenancy
        for (const tenancy of allTenancies) {
            // Calculate rent obligations and payments
            const rentAmount = tenancy.property?.price || new Decimal(0);
            totalObligations = totalObligations.add(rentAmount);

            const rentPaid = tenancy.user.transactions.some(tx =>
                tx.reference === TransactionReference.RENT_PAYMENT &&
                this.decimalToNumber(tx.amount) >= this.decimalToNumber(rentAmount) * 0.95 && // 95% threshold
                (!tenancy.leaseEndDate || new Date(tx.createdAt) <= this.addDays(tenancy.leaseEndDate, GRACE_PERIOD_DAYS))
            );

            if (!rentPaid && tenancy.leaseEndDate && now > this.addDays(tenancy.leaseEndDate, GRACE_PERIOD_DAYS)) {
                totalDebt = totalDebt.add(rentAmount);
                hasCompleteNonPayment = true;
                const daysLate = this.dayDiff(this.addDays(tenancy.leaseEndDate, GRACE_PERIOD_DAYS), now);
                maxDaysLate = Math.max(maxDaysLate, daysLate);
            }

            // Calculate bill obligations and payments with frequency consideration
            for (const bill of tenancy.billsSubCategory) {
                const billAmount = bill.amount;
                const frequencyDays = this.getFrequencyDays(bill.billFrequency);
                const billStartDate = new Date(bill.createdAt);

                // Calculate number of expected payments based on frequency
                const daysActive = this.dayDiff(billStartDate, bill.dueDate);
                const expectedPayments = Math.ceil(daysActive / frequencyDays);

                // Total expected amount for this bill
                const totalBillAmount = billAmount.times(expectedPayments);
                totalObligations = totalObligations.add(totalBillAmount);

                // Check if all expected payments were made
                const billPayments = bill.transactions.filter(tx =>
                    this.decimalToNumber(tx.amount) >= this.decimalToNumber(billAmount) * 0.95
                );

                if (billPayments.length < expectedPayments) {
                    const unpaidCount = expectedPayments - billPayments.length;
                    totalDebt = totalDebt.add(billAmount.times(unpaidCount));

                    // Calculate days late for the most recent missed payment
                    const lastExpectedPaymentDate = this.addDays(billStartDate, frequencyDays * expectedPayments);
                    if (now > lastExpectedPaymentDate) {
                        const daysLate = this.dayDiff(lastExpectedPaymentDate, now);
                        maxDaysLate = Math.max(maxDaysLate, daysLate);
                    }
                }
            }

            // Check payment history records
            for (const history of tenancy.history) {
                const expected = history.expectedRentAmount || new Decimal(0);
                const paid = history.amountPaid || new Decimal(0);

                if (this.decimalToNumber(paid) < this.decimalToNumber(expected) * 0.95) {
                    totalDebt = totalDebt.add(expected.minus(paid));
                    if (history.rentEndDate && now > history.rentEndDate) {
                        const daysLate = this.dayDiff(history.rentEndDate, now);
                        maxDaysLate = Math.max(maxDaysLate, daysLate);
                    }
                }
            }
        }

        // Check for late fees across all tenancies
        const lateFees = allTenancies.reduce((count, tenancy) => {
            return count + tenancy.user.transactions.filter(
                tx => tx.reference === TransactionReference.LATE_FEE
            ).length;
        }, 0);

        if (lateFees > 0) {
            maxDaysLate = Math.max(maxDaysLate, lateFees * 7); // Estimate 7 days per late fee
        }

        // ------------------------------
        // Enhanced Scoring Logic
        // ------------------------------
        if (this.decimalToNumber(totalObligations) === 0) return 100; // No obligations = perfect

        // 1. Payment Completeness (50% weight)
        const paymentRatio = Math.min(1.5, 1 - (this.decimalToNumber(totalDebt) / this.decimalToNumber(totalObligations)));
        const completenessScore = paymentRatio * 100;

        // 2. Timeliness Penalty (30% weight)
        let timelinessScore = Math.max(30, 100 - (maxDaysLate * 0.5)); // 0.5 pts per day

        // 3. Complete Non-Payment Flag (20% weight)
        const nonPaymentScore = hasCompleteNonPayment ? 50 : 100;

        // Weighted composite score
        return Math.round(
            (completenessScore * 0.5) +
            (timelinessScore * 0.3) +
            (nonPaymentScore * 0.2)
        );
    }
    private async calculateCommunicationScore(userId: string): Promise<number> {
        // Get all messages involving this tenant from the last 90 days
        const messages = await prismaClient.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ],
                createdAt: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                },
                chatType: {
                    in: ['MAINTENANCE', 'APPLICATION']
                }
            },
            include: {
                chatRoom: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (messages.length === 0) return 80; // Neutral score for no communication

        // Analyze communication patterns
        let responseTimes: number[] = [];
        let positiveToneCount = 0;
        let negativeToneCount = 0;
        let totalMessages = 0;
        let tenantMessages = 0;

        // Track conversation threads
        const conversationThreads: Record<string, { lastLandlordMsg?: Date, waitingForReply: boolean }> = {};

        messages.forEach(message => {
            const isTenant = message.senderId === userId;
            const chatRoomId = message.chatRoomId;

            // Initialize thread tracking if new conversation
            if (!conversationThreads[chatRoomId]) {
                conversationThreads[chatRoomId] = { waitingForReply: false };
            }

            const thread = conversationThreads[chatRoomId];

            if (!isTenant) {
                // Landlord/agent sent message - track and wait for reply
                thread.lastLandlordMsg = message.createdAt;
                thread.waitingForReply = true;
            } else {
                // Tenant sent message
                tenantMessages++;

                // Calculate response time if this is a reply
                if (thread.waitingForReply && thread.lastLandlordMsg) {
                    const responseTimeHours = (message.createdAt.getTime() - thread.lastLandlordMsg.getTime()) / (1000 * 60 * 60);
                    responseTimes.push(responseTimeHours);
                    thread.waitingForReply = false;
                }

                // Simple tone analysis (in a real app, use NLP)
                const content = message.content?.toLowerCase() || '';
                if (content.includes('thank') || content.includes('please') ||
                    content.includes('sorry') || content.includes('appreciate')) {
                    positiveToneCount++;
                } else if (content.includes('angry') || content.includes('frustrat') ||
                    content.includes('unhappy') || content.includes('disappoint')) {
                    negativeToneCount++;
                }
            }
            totalMessages++;
        });

        // Calculate responsiveness metrics
        const avgResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

        const responseScore = this.calculateResponseScore(avgResponseTime);
        const toneScore = this.calculateToneScore(positiveToneCount, negativeToneCount, tenantMessages);
        const engagementScore = this.calculateEngagementScore(tenantMessages, totalMessages);

        // Weighted final score
        const finalScore = Math.round(
            (responseScore * 0.5) +
            (toneScore * 0.3) +
            (engagementScore * 0.2)
        );

        return Math.max(10, Math.min(100, finalScore));
    }
    private async calculateInspectionConsistency(userId: string): Promise<number> {
        // Get all inspections for the tenant across all properties
        const inspections = await prismaClient.inspection.findMany({
            where: { tenant: { userId } },
            include: {
                property: {
                    include: {
                        landlord: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (inspections.length === 0) return 100; // No inspections = perfect score

        // Analyze inspection frequency patterns
        const inspectionFrequency = this.calculateInspectionFrequency(inspections);
        const frequencyPenalty = inspectionFrequency > 2 ? 0 : 10 - (inspectionFrequency * 2);

        // Categorize inspection outcomes
        let perfectInspections = 0;
        let goodInspections = 0;
        let failedInspections = 0;
        let requiresRemediation = 0;

        inspections.forEach(inspection => {
            if (inspection.score >= 90) {
                perfectInspections++;
            } else if (inspection.score >= 70) {
                goodInspections++;
                if (inspection.notes?.toLowerCase().includes('reminder') ||
                    inspection.notes?.toLowerCase().includes('follow up')) {
                    requiresRemediation++;
                }
            } else {
                failedInspections++;
                if (inspection.notes?.toLowerCase().includes('damage') ||
                    inspection.notes?.toLowerCase().includes('repair')) {
                    requiresRemediation++;
                }
            }
        });

        // Calculate base score based on inspection outcomes
        let baseScore: number;
        if (failedInspections === 0 && requiresRemediation === 0) {
            baseScore = 100; // All passed with positive comments
        } else if (failedInspections === 0) {
            baseScore = 85 - (requiresRemediation * 5); // Some required reminders (70-90)
        } else {
            baseScore = 60 - (failedInspections * 10); // Repeated failed inspections (<60)
        }

        // Apply frequency penalty (more frequent inspections = higher potential penalty)
        const finalScore = Math.max(0, baseScore - frequencyPenalty);

        return Math.round(finalScore);
    }
    private async calculateDepositDeductions(userId: string): Promise<number> {
        // 1. Get the initial security deposit amount from first rent payment
        const initialRentPayment = await prismaClient.transaction.findFirst({
            where: {
                userId,
                reference: TransactionReference.RENT_PAYMENT,
                status: TransactionStatus.COMPLETED
            },
            orderBy: { createdAt: 'asc' },
            take: 1
        });

        if (!initialRentPayment) return 100; // No deposit paid = perfect score

        const securityDepositPercentage = initialRentPayment.securityDepositPercentage || 10; // Default to 10%
        const depositAmount = (this.decimalToNumber(initialRentPayment.amount) * securityDepositPercentage) / 100;

        // 2. Get maintenance and inspection data
        const [maintenanceIssues, inspections] = await Promise.all([
            prismaClient.maintenance.findMany({
                where: {
                    tenant: { userId },
                    OR: [
                        { status: maintenanceStatus.COMPLETED, amount: { not: null } }, // Completed with cost
                        { status: { not: maintenanceStatus.COMPLETED } } // Unresolved issues
                    ],
                    flagCancellation: false
                },
                select: {
                    status: true,
                    amount: true,
                    description: true
                }
            }),
            prismaClient.inspection.findMany({
                where: { tenant: { userId } },
                orderBy: { createdAt: 'desc' },
                select: {
                    score: true,
                    notes: true
                }
            })
        ]);

        // 3. Calculate maintenance deductions
        const maintenanceDeductions = maintenanceIssues.reduce((sum, issue) => {
            if (issue.status === maintenanceStatus.COMPLETED && issue.amount) {
                return sum + this.decimalToNumber(issue.amount);
            }
            // For unresolved issues, apply standard penalty
            return sum + (depositAmount * 0.02); // 2% of deposit per unresolved issue
        }, 0);

        // 4. Calculate inspection penalties
        const inspectionDeductions = inspections.reduce((sum, inspection) => {
            if (inspection.score < 70) {
                // For failed inspections, check notes for damage severity
                const isMajorDamage = inspection.notes?.toLowerCase().includes('damage') ||
                    inspection.notes?.toLowerCase().includes('repair');
                return sum + (isMajorDamage ? depositAmount * 0.05 : depositAmount * 0.02);
            }
            return sum;
        }, 0);

        // 5. Calculate total deductions
        const totalDeductions = maintenanceDeductions + inspectionDeductions;
        const depositRemaining = Math.max(0, depositAmount - totalDeductions);
        const depositPercentage = (depositRemaining / depositAmount) * 100;

        // 6. Apply scoring tiers
        return this.calculateDepositScore(depositPercentage);
    }
    private async calculateComplaintsRecord(userId: string): Promise<number> {
        // Get all violations against this tenant
        const violations = await prismaClient.violation.findMany({
            where: {
                tenant: { userId },
                isDeleted: false
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // No violations = perfect score
        if (violations.length === 0) return 100;

        // Time weighting - recent violations matter more (last 12 months)
        const now = new Date();
        const ONE_YEAR_AGO = new Date(now.setFullYear(now.getFullYear() - 1));

        // Process violations with severity levels
        let scoreImpact = 0;
        let extremeViolations = 0;
        let criticalViolations = 0;
        let recentViolations = 0;

        violations.forEach(violation => {
            const isRecent = violation.createdAt > ONE_YEAR_AGO;
            let severity = 0;

            // Map violation severity to impact points
            switch (violation.severityLevel) {
                case 'EXTREME':
                    severity = 15;
                    extremeViolations++;
                    break;
                case 'CRITICAL':
                    severity = 10;
                    criticalViolations++;
                    break;
                case 'SEVERE':
                    severity = 7;
                    break;
                case 'MODERATE':
                    severity = 4;
                    break;
                case 'LOW':
                default:
                    severity = 2;
            }

            // Double impact if no action was taken
            if (!violation.actionTaken) severity *= 2;

            // Count recent violations
            if (isRecent) recentViolations++;

            // Apply time weighting (recent violations count more)
            scoreImpact += isRecent ? severity * 1.5 : severity;
        });

        // Calculate base score
        let score = 100 - scoreImpact;

        // Apply scoring tiers based on violation patterns
        if (extremeViolations > 0) {
            // Automatic failing score for extreme violations
            score = Math.max(10, 30 - (extremeViolations * 5));
        }
        else if (criticalViolations > 0) {
            // Significant penalty for critical violations
            score = Math.max(30, 60 - (criticalViolations * 10));
        }
        else if (recentViolations > 2) {
            // Multiple recent violations
            score = Math.max(40, 70 - (recentViolations * 5));
        }
        else {
            // Normal scoring with minimum floor
            score = Math.max(50, score);
        }

        return Math.round(Math.max(10, Math.min(100, score)));
    }
    private async calculateEvictionHistory(userId: string): Promise<number> {
        // Get all eviction-related violations for the tenant
        const evictionViolations = await prismaClient.violation.findMany({
            where: {
                tenant: { userId },
                isDeleted: false,
                OR: [
                    { description: { contains: 'eviction', mode: 'insensitive' } },
                    { description: { contains: 'legal notice', mode: 'insensitive' } },
                    { description: { contains: 'warning', mode: 'insensitive' } }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // No eviction-related violations = perfect score
        if (evictionViolations.length === 0) return 100;

        // Categorize violations
        let hasActualEviction = false;
        let hasLegalNotice = false;
        let hasWarning = false;

        evictionViolations.forEach(violation => {
            const desc = violation.description.toLowerCase();

            if (desc.includes('eviction') &&
                (desc.includes('order') || desc.includes('executed'))) {
                hasActualEviction = true;
            }
            else if (desc.includes('legal notice')) {
                hasLegalNotice = true;
            }
            else if (desc.includes('warning')) {
                hasWarning = true;
            }
        });

        // Apply scoring logic
        if (hasActualEviction) {
            return 30; // Actual eviction gets the lowest score
        }
        else if (hasLegalNotice) {
            return Math.floor(Math.random() * 11) + 70; // Random score between 70-80
        }
        else if (hasWarning) {
            return 80; // Informal warning
        }

        // Default return if none of the above matched (shouldn't happen)
        return 100;
    }
    private async calculatePropertyCondition(userId: string): Promise<number> {
        const [violations, inspections] = await Promise.all([
            prismaClient.violation.findMany({
                where: {
                    tenant: { userId },
                    isDeleted: false,
                    severityLevel: { in: [SeverityLevel.MODERATE, SeverityLevel.SEVERE, SeverityLevel.CRITICAL, SeverityLevel.EXTREME] }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prismaClient.inspection.findMany({
                where: { tenant: { userId } },
                orderBy: { createdAt: 'desc' },
            })
        ]);

        // Base score starts at perfect
        let score = 100;

        // 1. Apply violation penalties (cumulative)
        violations.forEach(violation => {
            switch (violation.severityLevel) {
                case 'EXTREME':
                    score -= 25; // Major damage
                    break;
                case 'CRITICAL':
                    score -= 15; // Significant damage
                    break;
                case 'SEVERE':
                    score -= 10; // Noticeable damage
                    break;
                case 'MODERATE':
                    score -= 5;  // Minor damage
                    break;
            }
        });

        // 2. Apply inspection adjustments
        if (inspections.length > 0) {
            const avgInspectionScore = inspections.reduce(
                (sum, insp) => sum + insp.score, 0) / inspections.length;

            // Map inspection average to adjustment
            if (avgInspectionScore >= 90) {
                score += 5; // Bonus for excellent maintenance
            } else if (avgInspectionScore <= 60) {
                score -= 15; // Penalty for poor condition
            }
        }

        // 3. Apply special conditions
        const hasUnresolvedDamage = violations.some(v =>
            !v.actionTaken &&
            (['SEVERE', 'CRITICAL', 'EXTREME'] as const).includes(
                v.severityLevel as 'SEVERE' | 'CRITICAL' | 'EXTREME'
            )
        );

        if (hasUnresolvedDamage) {
            score = Math.min(60, score); // Cap at 60 if major unresolved damage
        }

        // 4. Apply scoring tiers
        return this.applyPropertyConditionTiers(score);
    }

    private async calculateAgreementCompliance(userId: string): Promise<number> {
        // Get all relevant violations and lease breaches
        const [violations, leaseBreaches] = await Promise.all([
            prismaClient.violation.findMany({
                where: {
                    tenant: { userId },
                    isDeleted: false,
                    severityLevel: {
                        in: ['MODERATE', 'SEVERE', 'CRITICAL', 'EXTREME']
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prismaClient.tenantLeaseBreach.findMany({
                where: { 
                    tenantId: userId,
                    resolved: false // Only count unresolved breaches
                },
                orderBy: { date: 'desc' }
            })
        ]);
    
        // Start with perfect score
        let score = 100;
    
        // 1. Process violations (weighted by severity)
        violations.forEach(violation => {
            const severity = violation.severityLevel as 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'EXTREME';
            
            switch(severity) {
                case 'EXTREME':
                    score -= 35;
                    break;
                case 'CRITICAL':
                    score -= 25;
                    break;
                case 'SEVERE':
                    score -= 15;
                    break;
                case 'MODERATE':
                    score -= 8; // Slightly increased moderate penalty
                    break;
            }
        });
    
        // 2. Process lease breaches with expanded breach types
        leaseBreaches.forEach(breach => {
            switch(breach.breachType) {
                // Severe breaches
                case 'SUBLETTING':
                case 'ILLEGAL_ACTIVITY':
                case 'UNAUTHORIZED_BUSINESS':
                    score -= 30;
                    break;
                    
                // Significant breaches
                case 'UNAUTHORIZED_OCCUPANT':
                case 'PROPERTY_DAMAGE':
                case 'SMOKING_VIOLATION':
                    score -= 20;
                    break;
                    
                // Moderate breaches
                case 'NOISE_VIOLATION':
                case 'PARKING_VIOLATION':
                case 'TRASH_VIOLATION':
                    score -= 15;
                    break;
                    
                // Common minor breaches
                case 'UNAUTHORIZED_PET':
                case 'LATE_PAYMENT':
                case 'GUEST_VIOLATION':
                    score -= 10;
                    break;
                    
                // Technical breaches
                case 'INSURANCE_LAPSE':
                case 'MAINTENANCE_NEGLECT':
                    score -= 8;
                    break;
                    
                // Other unspecified breaches
                case 'OTHER':
                default:
                    score -= 12;
            }
            
            // Additional penalty for repeat offenses
            if (breach.repeatOffense) {
                score -= 5;
            }
        });
    
        // Apply minimum score floor
        score = Math.max(10, score);
    
        // Enhanced scoring tiers with more granularity
        if (score >= 97) return 100;       // Exceptional compliance
        if (score >= 90) return 95;        // Excellent compliance
        if (score >= 80) return 85;        // Minor issues
        if (score >= 70) return 75;        // Occasional breaches  
        if (score >= 60) return 65;        // Some compliance issues
        if (score >= 50) return 55;        // Frequent issues
        if (score >= 40) return 45;        // Significant non-compliance
        if (score >= 30) return 35;        // Serious violations
        if (score >= 20) return 25;        // Severe non-compliance
        return 10;                         // Extreme violations
    }









    // -------------------

    async calculateOverallScore(userId: string) {
        const [
            rentPaymentScore,        // 20%
            tenancyStabilityScore,   // 10%
            propertyConditionScore,  // 10%
            agreementScore,          // 10%
            communicationScore,      // 5%
            utilityComplianceScore,  // 5%
            evictionScore,           // 10%
            depositDeductionScore,   // 5%
            complaintsRecordScore,   // 5%
            inspectionScore,         // 5%
            overdueScore,            // 10%
            rentToIncomeScore        // 5%
        ] = await Promise.all([
            this.calculateRentPaymentScore(userId),
            this.calculateTenancyStability(userId),
            this.calculatePropertyCondition(userId),
            this.calculateAgreementCompliance(userId),
            this.calculateCommunicationScore(userId),
            this.calculateUtilityCompliance(userId),
            this.calculateEvictionHistory(userId),
            this.calculateDepositDeductions(userId),
            this.calculateComplaintsRecord(userId),
            this.calculateInspectionConsistency(userId),
            this.calculateOverdueScore(userId),
            this.calculateRentToIncomeRatio(userId)
        ]);
    
        // Weighted average calculation based on documentation
        const overallScore = Math.round(
            (rentPaymentScore * 0.20) +
            (tenancyStabilityScore * 0.10) +
            (propertyConditionScore * 0.10) +
            (agreementScore * 0.10) +
            (communicationScore * 0.05) +
            (utilityComplianceScore * 0.05) +
            (evictionScore * 0.10) +
            (depositDeductionScore * 0.05) +
            (complaintsRecordScore * 0.05) +
            (inspectionScore * 0.05) +
            (overdueScore * 0.10) +
            (rentToIncomeScore * 0.05)
        );
    
        const riskLevel = this.determineRiskLevel(overallScore);
    
        return {
            rentPaymentScore,
            tenancyStabilityScore,
            propertyConditionScore,
            agreementScore,
            communicationScore,
            utilityComplianceScore,
            evictionScore,
            depositDeductionScore,
            complaintsRecordScore,
            inspectionScore,
            overdueScore,
            rentToIncomeScore,
            overallScore,
            riskLevel
        };
    }
    
   

    // Helper methods
    private applyPropertyConditionTiers(rawScore: number): number {
        // Ensure score stays within bounds
        const boundedScore = Math.max(10, Math.min(100, rawScore));

        // Apply tiered scoring logic
        if (boundedScore >= 95) return 100;       // Spotless
        if (boundedScore >= 85) return 90;        // Minor wear
        if (boundedScore >= 70) return 80;        // Some damage
        if (boundedScore >= 50) return 65;        // Significant issues
        return boundedScore;                      // Poor condition
    }
    private calculateResponseScore(avgHours: number): number {
        if (avgHours === 0) return 80; // No responses to measure

        // Score based on response time
        if (avgHours <= 12) return 100; // Excellent (under 12 hours)
        if (avgHours <= 24) return 90;  // Good (under 24 hours)
        if (avgHours <= 48) return 75;  // Moderate (under 48 hours)
        if (avgHours <= 72) return 60;  // Poor (under 72 hours)
        return 40;                       // Very poor (over 72 hours)
    }

    private calculateToneScore(positive: number, negative: number, total: number): number {
        if (total === 0) return 80;

        const positiveRatio = positive / total;
        const negativeRatio = negative / total;

        if (negativeRatio > 0.3) return 40;  // Aggressive/negative tone
        if (positiveRatio > 0.5) return 100; // Very positive tone
        if (positiveRatio > 0.3) return 85;  // Generally positive
        return 70;                           // Neutral tone
    }

    private calculateEngagementScore(tenantMessages: number, totalMessages: number): number {
        if (totalMessages === 0) return 80;

        const engagementRatio = tenantMessages / (totalMessages / 2); // Ideal is 1:1 ratio

        if (engagementRatio >= 1) return 100;    // Very engaged
        if (engagementRatio >= 0.7) return 85;   // Good engagement
        if (engagementRatio >= 0.4) return 70;   // Moderate engagement
        return 50;                               // Poor engagement
    }
    private calculateInspectionFrequency(inspections: inspection[]): number {
        if (inspections.length < 2) return 0;
        // Calculate average days between inspections
        let totalDays = 0;
        for (let i = 1; i < inspections.length; i++) {
            const diff = this.dayDiff(inspections[i].createdAt, inspections[i - 1].createdAt);
            totalDays += diff;
        }
        const avgDaysBetween = totalDays / (inspections.length - 1);
        // Convert to inspections per month
        return 30 / avgDaysBetween;
    }

    private determineRiskLevel(score: number) {
        if (score >= 850) return "EXCELLENT";
        if (score >= 700) return "GOOD";
        if (score >= 550) return "FAIR";
        if (score >= 400) return "POOR";
        return "CRITICAL";
    }
    // Updated frequency adaptation calculation
    private calculateFrequencyAdaptation(
        frequencyGroups: Record<PaymentFrequency, number>,
        rentFrequency?: PaymentFrequency
    ): number {
        const totalBills = Object.values(frequencyGroups).reduce((sum, count) => sum + count, 0);

        // If rent frequency exists, check alignment
        let alignmentScore = 80; // Base score
        if (rentFrequency && totalBills > 0) {
            const preferredFrequencyCount = frequencyGroups[rentFrequency] || 0;
            alignmentScore = Math.min(100,
                80 + (preferredFrequencyCount / totalBills) * 20
            );
        }

        // Score based on handling multiple frequencies
        const frequencyCount = Object.values(frequencyGroups).filter(count => count > 0).length;
        const diversityScore = frequencyCount === 1 ? 100 :
            frequencyCount === 2 ? 90 :
                frequencyCount === 3 ? 80 : 70;

        return Math.round((alignmentScore + diversityScore) / 2);
    }
    // Helper to calculate months difference remains the same
    private monthDiff(start: Date, end: Date): number {
        return (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
    }
    private getFrequencyDays(frequency: PaymentFrequency): number {
        switch (frequency) {
            case 'DAILY': return 1;
            case 'WEEKLY': return 7;
            case 'MONTHLY': return 30;
            case 'QUARTERLY': return 90;
            case 'YEARLY': return 365;
            case 'ANNUALLY': return 365;
            default: return 30; // Default to monthly
        }
    }

    private addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    private dayDiff(start: Date, end: Date): number {
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    private calculateDepositScore(percentage: number): number {
        if (percentage >= 95) return 100;
        if (percentage >= 85) return 90;
        if (percentage >= 70) return 80;
        if (percentage >= 50) return 65;
        if (percentage >= 30) return 50;
        return 30;
    }

    private decimalToNumber(decimal: Decimal): number {
        return parseFloat(decimal.toString());
    }
}

export default new PerformanceCalculator()