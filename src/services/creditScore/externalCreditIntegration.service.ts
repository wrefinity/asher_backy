import { DocumentType, YesNo } from '@prisma/client';
import { prismaClient } from '../..';

/** Reserved for Experian / Equifax / Checkr etc. — extend when live APIs are connected. */
export const EXTERNAL_CREDIT_PROVIDERS = [
  'EXPERIAN',
  'EQUIFAX',
  'TRANSUNION',
  'CHECKR',
  'MANUAL_UPLOAD',
  'LANDLORD_SCREENING',
] as const;

export type ExternalCreditProvider = (typeof EXTERNAL_CREDIT_PROVIDERS)[number];

export type ExternalCreditSignal = {
  bonusPoints: number;
  factors: string[];
  /** Numeric bureau score on 300–850 scale when a provider returns one. */
  providerScore?: number;
  providerName?: string;
  providerReferenceId?: string;
  source: 'VERIFICATION_STATUS' | 'MANUAL_DOCUMENT' | 'SCREENING' | 'PROVIDER' | null;
};

type ScreeningCreditCheck = {
  status?: string;
  evidence?: Array<{ source?: string; field?: string; value?: unknown; providerName?: string }>;
};

function hasTenantDoc(application: any, types: DocumentType | DocumentType[]): boolean {
  const wanted = Array.isArray(types) ? types : [types];
  return (application?.documents ?? [])
    .filter((doc: any) => !doc.agreementId)
    .some((doc: any) => wanted.includes(doc.docType as DocumentType));
}

function parseProviderScore(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readScreeningCreditCheck(checks: unknown): ScreeningCreditCheck | null {
  if (!checks || typeof checks !== 'object') return null;
  const credit = (checks as Record<string, unknown>).credit;
  if (!credit || typeof credit !== 'object') return null;
  return credit as ScreeningCreditCheck;
}

/**
 * Reads credit signals already stored via screening, manual uploads, or future provider webhooks.
 * Does not call third-party APIs — placeholder until bureau integrations are wired.
 */
export async function resolveExternalCreditSignals(
  application: any | null | undefined,
  applicationId?: string
): Promise<ExternalCreditSignal> {
  let bonusPoints = 0;
  const factors: string[] = [];
  let providerScore: number | undefined;
  let providerName: string | undefined;
  let providerReferenceId: string | undefined;
  let source: ExternalCreditSignal['source'] = null;

  if (!application) {
    return { bonusPoints, factors, source };
  }

  if (application.creditCheckStatus === YesNo.YES) {
    bonusPoints += 20;
    factors.push('Credit/background check marked verified on application (+20)');
    source = 'VERIFICATION_STATUS';
  }

  if (hasTenantDoc(application, DocumentType.CREDIT_REPORT)) {
    bonusPoints += 12;
    factors.push('Credit report document on file (+12)');
    source = source ?? 'MANUAL_DOCUMENT';
  }

  if (hasTenantDoc(application, DocumentType.BACKGROUND_CHECK)) {
    bonusPoints += 8;
    factors.push('Background check document on file (+8)');
    source = source ?? 'MANUAL_DOCUMENT';
  }

  const resolvedApplicationId = applicationId ?? application.id;
  if (resolvedApplicationId) {
    const latestRun = await prismaClient.applicationScreeningRun.findFirst({
      where: { applicationId: resolvedApplicationId },
      orderBy: { triggeredAt: 'desc' },
      select: { checks: true },
    });

    const creditCheck = readScreeningCreditCheck(latestRun?.checks);
    if (creditCheck?.status === 'YES') {
      if (application.creditCheckStatus !== YesNo.YES) {
        bonusPoints += 15;
        factors.push('Screening credit check passed (+15)');
      }
      source = source ?? 'SCREENING';
    }

    for (const evidence of creditCheck?.evidence ?? []) {
      if (evidence.field === 'providerReferenceId' && evidence.value) {
        providerReferenceId = String(evidence.value);
        bonusPoints += 5;
        factors.push('Credit provider reference recorded (+5)');
        source = 'PROVIDER';
      }

      if (evidence.field === 'providerScore') {
        const parsed = parseProviderScore(evidence.value);
        if (parsed != null) {
          providerScore = parsed;
          providerName =
            (typeof evidence.providerName === 'string' && evidence.providerName) ||
            (typeof evidence.source === 'string' && evidence.source) ||
            'Credit provider';
          factors.push(
            `${providerName} score on file (${Math.round(parsed)}) — applied to starter profile`
          );
          source = 'PROVIDER';
        }
      }

      if (evidence.field === 'providerName' && typeof evidence.value === 'string') {
        providerName = evidence.value;
      }
    }
  }

  return {
    bonusPoints,
    factors,
    providerScore,
    providerName,
    providerReferenceId,
    source,
  };
}

/**
 * When a bureau returns a numeric score, honour it on the starter profile (still capped separately).
 * Good external scores (≥620) can lift the user above the 650 default until behavioural scoring kicks in.
 */
export function applyExternalProviderScoreFloor(
  starterScore: number,
  signal: ExternalCreditSignal,
  maxScore = 750
): number {
  const external = signal.providerScore;
  if (external == null || external < 620) {
    return starterScore;
  }

  const providerAligned = Math.max(starterScore, Math.min(Math.round(external), maxScore));
  return providerAligned;
}

export default {
  resolveExternalCreditSignals,
  applyExternalProviderScoreFloor,
  EXTERNAL_CREDIT_PROVIDERS,
};
