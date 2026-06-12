CREATE TABLE IF NOT EXISTS "ApplicationScreeningRun" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "triggeredByUserId" TEXT,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overall" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "checks" JSONB NOT NULL,
  "statusUpdate" JSONB NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "riskFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "blockedReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApplicationScreeningRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationScreeningRun_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "application"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ApplicationScreeningRun_applicationId_triggeredAt_idx"
  ON "ApplicationScreeningRun"("applicationId", "triggeredAt");

CREATE INDEX IF NOT EXISTS "ApplicationScreeningRun_overall_idx"
  ON "ApplicationScreeningRun"("overall");

CREATE INDEX IF NOT EXISTS "ApplicationScreeningRun_triggeredByUserId_idx"
  ON "ApplicationScreeningRun"("triggeredByUserId");
