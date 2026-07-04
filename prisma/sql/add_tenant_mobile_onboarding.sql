ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "mobileTermsAcceptedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "mobileTermsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "mobileOnboardingCompletedAt" TIMESTAMPTZ;

-- Existing tenants with passwords already completed mobile setup.
UPDATE "tenants"
SET
  "mobileTermsAcceptedAt" = COALESCE("mobileTermsAcceptedAt", "updatedAt"),
  "mobileTermsVersion" = COALESCE("mobileTermsVersion", '2026-06-06'),
  "mobileOnboardingCompletedAt" = COALESCE("mobileOnboardingCompletedAt", "updatedAt")
WHERE "password" IS NOT NULL;
