-- CreateEnum
CREATE TYPE "maintenanceDecisionStatus" AS ENUM ('APPROVED', 'DECLINED', 'PENDING');

-- AlterTable
ALTER TABLE "maintenance" ADD COLUMN     "landlordDecision" "maintenanceDecisionStatus";
