import PerformanceCalculator from './PerformanceCalculator';
import relocationService, { PREMIUM_RELOCATE_MIN_DISPLAY_SCORE } from './relocation.service';
import { prismaClient } from '../db/prismaClient';

export type ReportGrade = 'E' | 'P' | 'S' | 'O';
export type ReferenceMode = 'TRADITIONAL' | 'ASHER_VOUCHED';

export interface AsherReportCard {
  rentPayment: ReportGrade;
  behaviour: ReportGrade;
  complaints: ReportGrade;
  propertyCare: ReportGrade;
  communication: ReportGrade;
  tenancyStability: ReportGrade;
  financialReliability: ReportGrade;
}

export interface AsherReferencePayload {
  referenceMode: 'ASHER_VOUCHED';
  displayScore: number;
  riskLevel: string;
  reportCard: AsherReportCard;
  subScores: Record<string, number>;
  recommendationLetter: string;
  guaranteeLetter: string;
  backingContact: {
    name: string;
    email: string;
    phone: string;
  };
  generatedAt: string;
  tenantSummary: {
    fullName: string;
    yearsInSystem?: string;
    currentProperty?: string;
  };
}

const GRADE_LABELS: Record<ReportGrade, string> = {
  E: 'Excellent',
  P: 'Pass',
  S: 'Satisfactory',
  O: 'OK',
};

export function scoreToGrade(subScore: number): ReportGrade {
  if (subScore >= 90) return 'E';
  if (subScore >= 75) return 'P';
  if (subScore >= 60) return 'S';
  return 'O';
}

function blendScores(...scores: number[]): number {
  const valid = scores.filter((s) => typeof s === 'number' && !Number.isNaN(s));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function buildRecommendationLetter(params: {
  tenantName: string;
  displayScore: number;
  reportCard: AsherReportCard;
  currentProperty?: string;
}): string {
  const { tenantName, displayScore, reportCard, currentProperty } = params;
  const propertyLine = currentProperty
    ? ` During their tenancy at ${currentProperty},`
    : ' During their tenancy,';

  return `To whom it may concern,

We are pleased to provide this Asher reference for ${tenantName}, an existing tenant on the Asher platform with a verified performance score of ${displayScore}/1000.

${propertyLine} ${tenantName} has demonstrated consistently strong conduct across our tracked tenancy dimensions. Rent payment is graded ${GRADE_LABELS[reportCard.rentPayment]} (${reportCard.rentPayment}), behaviour and lease compliance ${GRADE_LABELS[reportCard.behaviour]} (${reportCard.behaviour}), and property care ${GRADE_LABELS[reportCard.propertyCare]} (${reportCard.propertyCare}). Communication with landlords and agents has been ${GRADE_LABELS[reportCard.communication].toLowerCase()}, and their complaint record is ${GRADE_LABELS[reportCard.complaints].toLowerCase()}.

Asher has verified this tenant's application data, payment history, and behavioural record internally. Traditional guarantor and referee checks remain on file with Asher for security purposes and are not duplicated here; instead, Asher vouches for this applicant under our premium relocation programme.

We recommend ${tenantName} as a reliable tenant candidate for landlords seeking a pre-verified relocating applicant. Should you require further assistance, please contact Asher using the details provided in the guarantee section.

Sincerely,
Asher Tenant Services`;
}

function buildGuaranteeLetter(params: {
  tenantName: string;
  displayScore: number;
}): string {
  const { tenantName, displayScore } = params;
  return `Asher Guarantee & Backing Letter

Asher Property Technologies confirms that ${tenantName} has qualified for the Asher Vouched Relocation programme with a performance score of ${displayScore}/1000 (minimum ${PREMIUM_RELOCATE_MIN_DISPLAY_SCORE} required).

Under this programme, Asher stands behind the accuracy of the tenant's verified application profile and performance record presented to you. While this letter does not replace a formal guarantor agreement for rent shortfalls, Asher will act as the primary point of contact for tenancy-related disputes, payment mediation, and relocation support for the duration of the application and onboarding process.

For payment or tenancy issues relating to this vouched applicant, contact Asher Tenant Services using the contact details below. Our team will respond within two business days.

This guarantee applies only to applications initiated through Asher's premium relocation matching service.`;
}

class AsherReferenceService {
  private backingContact() {
    return {
      name: process.env.ASHER_SUPPORT_NAME || 'Asher Tenant Services',
      email: process.env.ASHER_SUPPORT_EMAIL || 'support@asher.com',
      phone: process.env.ASHER_SUPPORT_PHONE || '',
    };
  }

  async buildForUserId(userId: string, tenantContext?: { fullName?: string; currentProperty?: string; createdAt?: Date }) {
    const performance = await PerformanceCalculator.calculateOverallScore(userId);
    const displayScore = relocationService.getDisplayScore(performance.overallScore);

    if (displayScore < PREMIUM_RELOCATE_MIN_DISPLAY_SCORE) {
      return null;
    }

    const reportCard: AsherReportCard = {
      rentPayment: scoreToGrade(performance.rentPaymentScore),
      behaviour: scoreToGrade(performance.agreementScore),
      complaints: scoreToGrade(performance.complaintsRecordScore),
      propertyCare: scoreToGrade(
        blendScores(performance.propertyConditionScore, performance.inspectionScore, performance.depositDeductionScore)
      ),
      communication: scoreToGrade(performance.communicationScore),
      tenancyStability: scoreToGrade(performance.tenancyStabilityScore),
      financialReliability: scoreToGrade(
        blendScores(performance.overdueScore, performance.utilityComplianceScore, performance.rentToIncomeScore)
      ),
    };

    const tenantName = tenantContext?.fullName || 'The applicant';

    const asherReference: AsherReferencePayload = {
      referenceMode: 'ASHER_VOUCHED',
      displayScore,
      riskLevel: performance.riskLevel,
      reportCard,
      subScores: {
        rentPaymentScore: performance.rentPaymentScore,
        tenancyStabilityScore: performance.tenancyStabilityScore,
        propertyConditionScore: performance.propertyConditionScore,
        agreementScore: performance.agreementScore,
        communicationScore: performance.communicationScore,
        utilityComplianceScore: performance.utilityComplianceScore,
        evictionScore: performance.evictionScore,
        depositDeductionScore: performance.depositDeductionScore,
        complaintsRecordScore: performance.complaintsRecordScore,
        inspectionScore: performance.inspectionScore,
        overdueScore: performance.overdueScore,
        rentToIncomeScore: performance.rentToIncomeScore,
        overallScore: performance.overallScore,
      },
      recommendationLetter: buildRecommendationLetter({
        tenantName,
        displayScore,
        reportCard,
        currentProperty: tenantContext?.currentProperty,
      }),
      guaranteeLetter: buildGuaranteeLetter({ tenantName, displayScore }),
      backingContact: this.backingContact(),
      generatedAt: new Date().toISOString(),
      tenantSummary: {
        fullName: tenantName,
        currentProperty: tenantContext?.currentProperty,
      },
    };

    return asherReference;
  }

  async buildForTenantId(tenantId: string, landlordId: string) {
    const tenant = await prismaClient.tenants.findFirst({
      where: { id: tenantId, landlordId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            createdAt: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
        property: { select: { name: true } },
        relocationInterests: {
          where: { status: { in: ['ACTIVE', 'MATCHED'] } },
          take: 1,
        },
      },
    });

    if (!tenant?.user?.id) return null;

    const hasPremiumInterest = tenant.relocationInterests.length > 0;
    const fullName =
      tenant.user.profile?.fullname ||
      [tenant.user.profile?.firstName, tenant.user.profile?.lastName].filter(Boolean).join(' ') ||
      'Tenant';

    const asherReference = await this.buildForUserId(tenant.user.id, {
      fullName,
      currentProperty: tenant.property?.name,
      createdAt: tenant.user.createdAt,
    });

    if (!asherReference) return null;

    return {
      ...asherReference,
      isPremiumRelocate: hasPremiumInterest,
    };
  }

  async buildForEnquiry(enquiryId: string, landlordId: string) {
    const enquiry = await prismaClient.propertyEnquiry.findFirst({
      where: { id: enquiryId, landlordId },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                createdAt: true,
                profile: { select: { fullname: true, firstName: true, lastName: true } },
              },
            },
            property: { select: { name: true } },
            relocationInterests: {
              where: { status: { in: ['ACTIVE', 'MATCHED'] } },
              take: 1,
            },
          },
        },
      },
    });

    if (!enquiry?.tenant?.user?.id) return null;

    const ref = await this.buildForTenantId(enquiry.tenantId, landlordId);
    return ref;
  }
}

export default new AsherReferenceService();
