-- AlterTable
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "notificationType" TEXT;
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "route" TEXT;
