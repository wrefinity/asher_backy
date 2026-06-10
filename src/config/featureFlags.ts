/**
 * Identity verification gates leasing until admin approves ID upload.
 * Disabled by default — set IDENTITY_VERIFICATION_ENABLED=true to turn on.
 */
export function isIdentityVerificationEnabled(): boolean {
  return process.env.IDENTITY_VERIFICATION_ENABLED === 'true';
}

/**
 * Operational PMS profile (compliance, insurance, utilities, ownership).
 * Enabled by default. Set PMS_OPERATIONAL_PROFILE=false to disable.
 */
export function isPmsOperationalProfileEnabled(): boolean {
  return process.env.PMS_OPERATIONAL_PROFILE !== 'false';
}
