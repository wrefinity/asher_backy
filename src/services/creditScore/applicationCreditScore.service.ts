import {
  ApplicationStatus,
  DocumentType,
  TransactionReference,
  TransactionStatus,
} from '@prisma/client';
import { prismaClient } from '../..';
import {
  applyExternalProviderScoreFloor,
  resolveExternalCreditSignals,
} from './externalCreditIntegration.service';

/** Default score for new joiners — separate from behavioral scoring. */
export const DEFAULT_APPLICATION_CREDIT_SCORE = 650;
/** Tenant performance API uses overallScore × 10 for display. */
export const DEFAULT_APPLICATION_OVERALL_SCORE = 65;
export const MIN_MONTHS_FOR_BEHAVIORAL_SCORE = 6;

const APPLICATION_INCLUDE = {
  personalDetails: true,
  employmentInfo: true,
  residentialInfo: { include: { prevAddresses: true } },
  documents: true,
  declaration: true,
  employeeReference: true,
  referenceForm: true,
  guarantorInformation: true,
  guarantorAgreement: true,
  referee: true,
} as const;

const TENANT_DOC_TYPES = new Set<DocumentType>([
  DocumentType.ID,
  DocumentType.ADDRESS_PROOF,
  DocumentType.INCOME_PROOF,
  DocumentType.BANK_STATEMENT,
  DocumentType.PAY_STUB,
  DocumentType.EMPLOYMENT_LETTER,
  DocumentType.TAX_RETURN,
]);

function clampScore(score: number, min = DEFAULT_APPLICATION_CREDIT_SCORE, max = 750): number {
  return Math.max(min, Math.min(max, Math.round(score)));
}

function tenantDocuments(application: any) {
  return (application?.documents ?? []).filter((doc: any) => !doc.agreementId);
}

function hasDocType(application: any, types: DocumentType | DocumentType[]): boolean {
  const wanted = Array.isArray(types) ? types : [types];
  return tenantDocuments(application).some((doc: any) =>
    wanted.includes(doc.docType as DocumentType)
  );
}

function parseMoney(value: unknown): number {
  if (value == null) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTenancyMonths(tenancies: Array<{ leaseStartDate?: Date | null; leaseEndDate?: Date | null; isCurrentLease?: boolean }>): number {
  if (!tenancies?.length) return 0;
  const now = new Date();
  return tenancies.reduce((total, tenancy) => {
    if (!tenancy.leaseStartDate) return total;
    const start = new Date(tenancy.leaseStartDate);
    const end = tenancy.isCurrentLease
      ? now
      : tenancy.leaseEndDate
        ? new Date(tenancy.leaseEndDate)
        : now;
    return total + (end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000);
  }, 0);
}

function calculatePaymentHistoryMonths(payments: Array<{ createdAt: Date }>): number {
  if (!payments.length) return 0;
  const oldest = payments[payments.length - 1];
  const newest = payments[0];
  return (
    (new Date(newest.createdAt).getTime() - new Date(oldest.createdAt).getTime()) /
    (30 * 24 * 60 * 60 * 1000)
  );
}

/**
 * True when the user has enough on-platform history for the real behavioral score.
 * Mirrors professionalCreditScore assessDataQuality — do not change thresholds here
 * without updating that service too.
 */
export async function userHasBehavioralScoreEligibility(userId: string): Promise<boolean> {
  const [payments, tenancies] = await Promise.all([
    prismaClient.transaction.findMany({
      where: {
        userId,
        reference: TransactionReference.RENT_PAYMENT,
        status: TransactionStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prismaClient.tenants.findMany({
      where: { userId },
      select: {
        leaseStartDate: true,
        leaseEndDate: true,
        isCurrentLease: true,
      },
    }),
  ]);

  const paymentMonths = calculatePaymentHistoryMonths(payments);
  const hasCompletedTenancy = tenancies.some((t) => !t.isCurrentLease);
  const currentTenancyMonths = calculateTenancyMonths(tenancies);
  const hasMinimumPayments = payments.length >= 3;

  return (
    paymentMonths >= MIN_MONTHS_FOR_BEHAVIORAL_SCORE &&
    (hasCompletedTenancy || currentTenancyMonths >= MIN_MONTHS_FOR_BEHAVIORAL_SCORE) &&
    hasMinimumPayments
  );
}

async function loadLatestApplication(userId: string) {
  const tenant = await prismaClient.tenants.findFirst({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    select: { applicationId: true },
  });

  if (tenant?.applicationId) {
    return prismaClient.application.findUnique({
      where: { id: tenant.applicationId },
      include: APPLICATION_INCLUDE,
    });
  }

  return prismaClient.application.findFirst({
    where: {
      userId,
      isDeleted: false,
      status: {
        in: [
          ApplicationStatus.COMPLETED,
          ApplicationStatus.TENANT_CREATED,
          ApplicationStatus.APPROVED,
          ApplicationStatus.PENDING,
        ],
      },
    },
    orderBy: { updatedAt: 'desc' },
    include: APPLICATION_INCLUDE,
  });
}

export type ApplicationProfileScoreResult = {
  score: number;
  overallScore: number;
  bonusPoints: number;
  factors: string[];
  externalCreditSource?: string | null;
  externalProviderScore?: number;
  scoreBreakdown: {
    applicationProfile: {
      score: number;
      maxScore: number;
      percentage: number;
      factors: string[];
    };
    externalCredit?: {
      score: number;
      maxScore: number;
      percentage: number;
      factors: string[];
    };
  };
};

/**
 * Starter profile score for users without 6+ months of behavioral data.
 * Starts at 650 and only adds bonuses from application completeness — never penalises new joiners.
 */
export async function calculateApplicationProfileScore(
  userId: string
): Promise<ApplicationProfileScoreResult> {
  const application = await loadLatestApplication(userId);
  let bonusPoints = 0;
  const factors: string[] = [
    `Starter score (${DEFAULT_APPLICATION_CREDIT_SCORE}) — behavioural scoring unlocks after ${MIN_MONTHS_FOR_BEHAVIORAL_SCORE}+ months on platform`,
  ];

  if (!application) {
    factors.push('No application on file yet — using default starter score');
    return buildResult(bonusPoints, factors);
  }

  const personal = application.personalDetails;
  if (personal?.firstName && personal?.lastName && personal?.phoneNumber && personal?.email) {
    bonusPoints += 5;
    factors.push('Personal details complete (+5)');
  }

  const employment = application.employmentInfo;
  if (employment?.employmentStatus && parseMoney(employment.monthlyOrAnualIncome) > 0) {
    bonusPoints += 10;
    factors.push('Employment and income provided (+10)');
  }

  if (hasDocType(application, DocumentType.ID)) {
    bonusPoints += 10;
    factors.push('Photo ID uploaded (+10)');
  }
  if (hasDocType(application, [DocumentType.INCOME_PROOF, DocumentType.PAY_STUB, DocumentType.TAX_RETURN])) {
    bonusPoints += 10;
    factors.push('Income documentation uploaded (+10)');
  }
  if (hasDocType(application, DocumentType.ADDRESS_PROOF)) {
    bonusPoints += 5;
    factors.push('Proof of address uploaded (+5)');
  }
  if (hasDocType(application, DocumentType.BANK_STATEMENT)) {
    bonusPoints += 5;
    factors.push('Bank statement uploaded (+5)');
  }

  const docCount = tenantDocuments(application).filter((doc: any) =>
    TENANT_DOC_TYPES.has(doc.docType as DocumentType)
  ).length;
  if (docCount >= 4) {
    bonusPoints += 5;
    factors.push('Strong document package (+5)');
  }

  if (application.declaration?.some((entry: any) => entry.signature)) {
    bonusPoints += 5;
    factors.push('Application declaration signed (+5)');
  }

  const prevAddresses = application.residentialInfo?.prevAddresses ?? [];
  if (prevAddresses.length >= 1 || application.residentialInfo?.address) {
    bonusPoints += 5;
    factors.push('Residential history provided (+5)');
  }

  const employeeRef = application.employeeReference;
  if (employeeRef?.refereeName || employeeRef?.companyName) {
    bonusPoints += 8;
    factors.push('Employer reference submitted (+8)');
  }

  const landlordRef = application.referenceForm;
  if (landlordRef?.signature || landlordRef?.status === 'COMPLETED') {
    bonusPoints += 8;
    factors.push('Previous landlord reference submitted (+8)');
  }

  if (application.guarantorInformation?.fullName) {
    bonusPoints += 5;
    factors.push('Guarantor nominated (+5)');
  }
  if (
    application.guarantorAgreement?.signedByGuarantor ||
    application.guarantorAgreement?.guarantorSignature
  ) {
    bonusPoints += 10;
    factors.push('Guarantor reference completed (+10)');
  }

  if (application.referee?.professionalReferenceName || application.referee?.personalReferenceName) {
    bonusPoints += 5;
    factors.push('Personal/professional referees provided (+5)');
  }

  if (application.employmentVerificationStatus === 'YES') {
    bonusPoints += 5;
    factors.push('Employment verified (+5)');
  }
  if (application.incomeVerificationStatus === 'YES') {
    bonusPoints += 5;
    factors.push('Income verified (+5)');
  }

  const externalCredit = await resolveExternalCreditSignals(application, application.id);
  bonusPoints += externalCredit.bonusPoints;
  factors.push(...externalCredit.factors);

  return buildResult(bonusPoints, factors, externalCredit);
}

function buildResult(
  bonusPoints: number,
  factors: string[],
  externalCredit?: Awaited<ReturnType<typeof resolveExternalCreditSignals>>
): ApplicationProfileScoreResult {
  let score = clampScore(DEFAULT_APPLICATION_CREDIT_SCORE + bonusPoints);
  if (externalCredit) {
    score = applyExternalProviderScoreFloor(score, externalCredit);
  }
  const overallScore = Math.round(score / 10);
  const maxBonus = 750 - DEFAULT_APPLICATION_CREDIT_SCORE;
  const applicationBonus = bonusPoints - (externalCredit?.bonusPoints ?? 0);

  return {
    score,
    overallScore,
    bonusPoints,
    factors,
    externalCreditSource: externalCredit?.source ?? null,
    externalProviderScore: externalCredit?.providerScore,
    scoreBreakdown: {
      applicationProfile: {
        score: applicationBonus,
        maxScore: maxBonus,
        percentage: Math.min(100, Math.round((applicationBonus / maxBonus) * 100)),
        factors: factors.filter((f) => !externalCredit?.factors.includes(f)),
      },
      ...(externalCredit && externalCredit.bonusPoints > 0
        ? {
            externalCredit: {
              score: externalCredit.bonusPoints,
              maxScore: 60,
              percentage: Math.min(100, Math.round((externalCredit.bonusPoints / 60) * 100)),
              factors: externalCredit.factors,
            },
          }
        : {}),
    },
  };
}

/** Maps application profile score into the tenant performance API shape. */
export function buildPerformanceScoreFromApplicationProfile(
  profile: ApplicationProfileScoreResult
) {
  const overallScore = profile.overallScore;
  const riskLevel =
    overallScore >= 80 ? 'Low Risk' :
    overallScore >= 65 ? 'Moderate Risk' :
    'High Risk';

  return {
    rentPaymentScore: overallScore,
    tenancyStabilityScore: overallScore,
    propertyConditionScore: overallScore,
    agreementScore: overallScore,
    communicationScore: overallScore,
    utilityComplianceScore: overallScore,
    evictionScore: overallScore,
    depositDeductionScore: overallScore,
    complaintsRecordScore: overallScore,
    inspectionScore: overallScore,
    overdueScore: overallScore,
    rentToIncomeScore: overallScore,
    overallScore,
    riskLevel,
    scoreSource: 'APPLICATION_PROFILE' as const,
    applicationProfileFactors: profile.factors,
    externalCreditSource: profile.externalCreditSource ?? null,
    externalProviderScore: profile.externalProviderScore,
  };
}

export default {
  userHasBehavioralScoreEligibility,
  calculateApplicationProfileScore,
  buildPerformanceScoreFromApplicationProfile,
  DEFAULT_APPLICATION_CREDIT_SCORE,
  DEFAULT_APPLICATION_OVERALL_SCORE,
  MIN_MONTHS_FOR_BEHAVIORAL_SCORE,
};
