-- Add propertyListingId to application and tenants for engagement ID chain continuity.
-- Run against your Postgres DB after deploying schema changes.

ALTER TABLE "application"
  ADD COLUMN IF NOT EXISTS "propertyListingId" TEXT;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "propertyListingId" TEXT;

CREATE INDEX IF NOT EXISTS "application_propertyListingId_idx"
  ON "application" ("propertyListingId");

-- Backfill application.propertyListingId from invite → enquiry chain
UPDATE "application" a
SET "propertyListingId" = COALESCE(
  ai."propertyListingId",
  e."propertyListingId"
)
FROM "applicationInvites" ai
LEFT JOIN "Log" e ON e.id = ai."enquiryId"
WHERE a."applicationInviteId" = ai.id
  AND a."propertyListingId" IS NULL
  AND COALESCE(ai."propertyListingId", e."propertyListingId") IS NOT NULL;

-- Backfill tenants from linked application
UPDATE "tenants" t
SET "propertyListingId" = a."propertyListingId"
FROM "application" a
WHERE t."applicationId" = a.id
  AND t."propertyListingId" IS NULL
  AND a."propertyListingId" IS NOT NULL;

-- Optional FK constraints (skip if orphaned rows exist)
-- ALTER TABLE "application"
--   ADD CONSTRAINT "application_propertyListingId_fkey"
--   FOREIGN KEY ("propertyListingId") REFERENCES "propertyListingHistory"(id) ON DELETE SET NULL;
-- ALTER TABLE "tenants"
--   ADD CONSTRAINT "tenants_propertyListingId_fkey"
--   FOREIGN KEY ("propertyListingId") REFERENCES "propertyListingHistory"(id) ON DELETE SET NULL;
