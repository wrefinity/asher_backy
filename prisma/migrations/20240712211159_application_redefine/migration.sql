/*
  Warnings:

  - You are about to drop the column `applicationId` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `emergencyContact` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `guarantorInformation` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `residentialInformation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmploymentInformation" DROP CONSTRAINT "EmploymentInformation_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "emergencyContact" DROP CONSTRAINT "emergencyContact_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "guarantorInformation" DROP CONSTRAINT "guarantorInformation_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "residentialInformation" DROP CONSTRAINT "residentialInformation_applicationId_fkey";

-- AlterTable
ALTER TABLE "EmploymentInformation" DROP COLUMN "applicationId";

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "emergencyContactId" TEXT,
ADD COLUMN     "employmentInformationId" TEXT,
ADD COLUMN     "guarantorInformationId" TEXT,
ADD COLUMN     "residentialId" TEXT;

-- AlterTable
ALTER TABLE "emergencyContact" DROP COLUMN "applicationId";

-- AlterTable
ALTER TABLE "guarantorInformation" DROP COLUMN "applicationId";

-- AlterTable
ALTER TABLE "residentialInformation" DROP COLUMN "applicationId";

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "residentialInformation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_emergencyContactId_fkey" FOREIGN KEY ("emergencyContactId") REFERENCES "emergencyContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_employmentInformationId_fkey" FOREIGN KEY ("employmentInformationId") REFERENCES "EmploymentInformation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_guarantorInformationId_fkey" FOREIGN KEY ("guarantorInformationId") REFERENCES "guarantorInformation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
