import { ReferenceMode } from '../services/asherReference.service';

const STRIP_KEYS = [
  'referee',
  'referenceForm',
  'employeeReference',
  'guarantorAgreement',
  'guarantorInformation',
] as const;

const STRIP_VERIFICATION_KEYS = [
  'guarantorVerificationStatus',
  'refereeVerificationStatus',
  'landlordVerificationStatus',
] as const;

export function shouldUseAsherVouched(asherReference: unknown): boolean {
  return Boolean(asherReference && typeof asherReference === 'object');
}

export function stripTraditionalReferences<T extends Record<string, unknown>>(
  application: T | null | undefined,
  referenceMode: ReferenceMode = 'TRADITIONAL'
): T | null | undefined {
  if (!application || referenceMode !== 'ASHER_VOUCHED') {
    return application;
  }

  const stripped = { ...application } as Record<string, unknown>;
  for (const key of STRIP_KEYS) {
    stripped[key] = null;
  }
  for (const key of STRIP_VERIFICATION_KEYS) {
    stripped[key] = null;
  }
  stripped.referenceMode = 'ASHER_VOUCHED';
  return stripped as T;
}

export function resolveReferenceMode(
  asherReference: unknown,
  relocationInterestActive?: boolean
): ReferenceMode {
  if (shouldUseAsherVouched(asherReference)) return 'ASHER_VOUCHED';
  if (relocationInterestActive) return 'ASHER_VOUCHED';
  return 'TRADITIONAL';
}
