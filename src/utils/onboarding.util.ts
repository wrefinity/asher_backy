import { prismaClient } from '..';

/** Paths under `/api/landlord` allowed before onboarding is complete. */
export const LANDLORD_ONBOARDING_ALLOWED_PATHS: RegExp[] = [
  /^\/info(?:\/|$)/,
  /^\/identity-verification(?:\/|$)/,
  /^\/properties(?:\/|$)/,
  /^\/locations\/list$/,
  /^\/tenants\/upload$/,
  /^\/tenants(?:\/|$)/,
  /^\/bills(?:\/|$)/,
];

export function isLandlordOnboardingAllowedPath(path: string): boolean {
  const normalized = path.split('?')[0] || path;
  return LANDLORD_ONBOARDING_ALLOWED_PATHS.some(pattern => pattern.test(normalized));
}

export async function ensureLandlordCode(landlordId: string | undefined | null): Promise<void> {
  if (!landlordId) return;

  const landlord = await prismaClient.landlords.findUnique({
    where: { id: landlordId },
    select: { landlordCode: true },
  });

  if (!landlord || landlord.landlordCode) return;

  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = 'LD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const existing = await prismaClient.landlords.findUnique({
      where: { landlordCode: code },
      select: { id: true },
    });
    if (!existing) isUnique = true;
  }

  await prismaClient.landlords.update({
    where: { id: landlordId },
    data: { landlordCode: code },
  });
}

export type OnboardingStepKey =
  | 'identityVerification'
  | 'profile'
  | 'business'
  | 'preferences'
  | 'properties'
  | 'globalSettings'
  | 'tenants'
  | 'finance';

export const ONBOARDING_TERMS_VERSION = '1.0';

export type OnboardingStatusPayload = {
  canAccessApp: boolean;
  /** Wizard dismissed after disclaimer accept (`onboardingCompletedAt` set). */
  isCompleted: boolean;
  onboardingCompletedAt: string | null;
  canUseLeasingFlows: boolean;
  identityVerification: {
    status: string;
    documentUrls: string[];
    canUseLeasingFlows: boolean;
    isCompleteForOnboarding: boolean;
  };
  steps: Record<OnboardingStepKey, boolean>;
  requiredSteps: OnboardingStepKey[];
  optionalSteps: OnboardingStepKey[];
  firstIncompleteRequiredStep: OnboardingStepKey | null;
  completionPercentage: number;
  requiredCompletionPercentage: number;
  counts: {
    properties: number;
    tenants: number;
    financeRecords: number;
  };
};

const REQUIRED_STEPS: OnboardingStepKey[] = [
  'profile',
  'business',
  'preferences',
  'properties',
  'globalSettings',
];

const OPTIONAL_STEPS: OnboardingStepKey[] = [
  'identityVerification',
  'tenants',
  'finance',
];

export function buildOnboardingAccess(steps: Record<OnboardingStepKey, boolean>): {
  canAccessApp: boolean;
  firstIncompleteRequiredStep: OnboardingStepKey | null;
  requiredCompletionPercentage: number;
  completionPercentage: number;
} {
  const requiredComplete = REQUIRED_STEPS.filter(key => steps[key]).length;
  const optionalComplete = OPTIONAL_STEPS.filter(key => steps[key]).length;
  const totalSteps = REQUIRED_STEPS.length + OPTIONAL_STEPS.length;

  const firstIncompleteRequiredStep =
    REQUIRED_STEPS.find(key => !steps[key]) ?? null;

  return {
    canAccessApp: firstIncompleteRequiredStep === null,
    firstIncompleteRequiredStep,
    requiredCompletionPercentage: Math.round(
      (requiredComplete / REQUIRED_STEPS.length) * 100
    ),
    completionPercentage: Math.round(
      ((requiredComplete + optionalComplete) / totalSteps) * 100
    ),
  };
}
