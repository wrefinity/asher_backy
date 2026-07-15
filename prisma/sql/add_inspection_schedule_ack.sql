ALTER TABLE "inspection"
  ADD COLUMN IF NOT EXISTS "tenantScheduleAcknowledgedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "inspection_tenantScheduleAcknowledgedAt_idx"
  ON "inspection" ("tenantScheduleAcknowledgedAt");
