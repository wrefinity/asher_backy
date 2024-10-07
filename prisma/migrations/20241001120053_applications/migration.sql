/*
  Warnings:

  - You are about to drop the column `isexisted` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `rentstatus` on the `tenants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "isexisted",
DROP COLUMN "rentstatus",
ALTER COLUMN "tenantId" DROP NOT NULL,
ALTER COLUMN "leaseStartDate" DROP NOT NULL,
ALTER COLUMN "leaseEndDate" DROP NOT NULL;
