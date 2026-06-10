/**
 * Strip sensitive operational PMS fields from public listing API responses.
 */
export function sanitizeOperationalProfileForPublic<T extends Record<string, unknown>>(
  payload: T
): T {
  const {
    complianceRecords: _c,
    insurancePolicies: _i,
    utilityAccounts: _u,
    ownershipProfile: _o,
    operationalProfileComplete: _oc,
    operationalProfileCompletedAt: _od,
    ...rest
  } = payload as T & {
    complianceRecords?: unknown;
    insurancePolicies?: unknown;
    utilityAccounts?: unknown;
    ownershipProfile?: unknown;
    operationalProfileComplete?: unknown;
    operationalProfileCompletedAt?: unknown;
  };

  return rest as T;
}

/** Public-safe compliance hints for listing detail (no account numbers). */
export function publicComplianceHints(
  records?: Array<{ certType: string; expiryDate?: Date | string | null; status?: string }>
): Array<{ label: string; status: string }> {
  if (!records?.length) return [];

  const publicTypes = new Set(['EPC', 'GAS_SAFETY', 'EICR', 'FIRE_RISK_ASSESSMENT']);
  return records
    .filter((r) => publicTypes.has(r.certType))
    .map((r) => ({
      label: r.certType.replace(/_/g, ' '),
      status: r.status || 'ON_FILE',
    }));
}

/** Attach public-safe compliance hints and strip sensitive operational fields. */
export function applyPublicComplianceHints<T extends Record<string, unknown>>(
  payload: T & {
    complianceRecords?: Array<{ certType: string; expiryDate?: Date | string | null; status?: string }>;
  }
): T & { publicComplianceHints?: Array<{ label: string; status: string }> } {
  const hints = publicComplianceHints(payload.complianceRecords);
  const sanitized = sanitizeOperationalProfileForPublic(payload);
  return {
    ...sanitized,
    ...(hints.length ? { publicComplianceHints: hints } : {}),
  };
}
