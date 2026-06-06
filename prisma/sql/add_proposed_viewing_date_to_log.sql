-- Tenant feedback: preferred date when requesting a re-visit
ALTER TABLE "Log"
ADD COLUMN IF NOT EXISTS "proposedViewingDate" TIMESTAMP(3);
