ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isAppAccessSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "appAccessSuspendedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "tenants_landlordId_isDeleted_idx"
  ON "tenants" ("landlordId", "isDeleted");
