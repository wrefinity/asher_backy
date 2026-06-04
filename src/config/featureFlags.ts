/**
 * Identity verification gates leasing until admin approves ID upload.
 * Disabled by default — set IDENTITY_VERIFICATION_ENABLED=true to turn on.
 */
export function isIdentityVerificationEnabled(): boolean {
  return process.env.IDENTITY_VERIFICATION_ENABLED === 'true';
}
