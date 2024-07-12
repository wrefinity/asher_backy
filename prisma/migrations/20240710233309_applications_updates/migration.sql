/*
  Warnings:

  - You are about to drop the column `applicantId` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `employerCompany` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `employerEmail` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `employerPhone` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `positionTitle` on the `EmploymentInformation` table. All the data in the column will be lost.
  - You are about to drop the column `applicantId` on the `emergencyContact` table. All the data in the column will be lost.
  - You are about to drop the column `applicantId` on the `guarantorInformation` table. All the data in the column will be lost.
  - You are about to drop the column `applicantId` on the `nextOfKin` table. All the data in the column will be lost.
  - You are about to drop the column `applicantId` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `currentLandlord` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `landlordEmail` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `landlordPhoneNumber` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the column `zipcode` on the `residentialInformation` table. All the data in the column will be lost.
  - You are about to drop the `applicant` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[applicantPersonalDetailsId]` on the table `nextOfKin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `applicationId` to the `EmploymentInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationId` to the `emergencyContact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationId` to the `guarantorInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landlordOrAgencyEmail` to the `residentialInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landlordOrAgencyName` to the `residentialInformation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landlordOrAgencyPhoneNumber` to the `residentialInformation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'DECLINED', 'COMPLETED', 'ACCEPTED');

-- DropForeignKey
ALTER TABLE "EmploymentInformation" DROP CONSTRAINT "EmploymentInformation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "applicant" DROP CONSTRAINT "applicant_userId_fkey";

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "emergencyContact" DROP CONSTRAINT "emergencyContact_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "guarantorInformation" DROP CONSTRAINT "guarantorInformation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "nextOfKin" DROP CONSTRAINT "nextOfKin_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "residentialInformation" DROP CONSTRAINT "residentialInformation_applicantId_fkey";

-- AlterTable
ALTER TABLE "EmploymentInformation" DROP COLUMN "applicantId",
DROP COLUMN "employerCompany",
DROP COLUMN "employerEmail",
DROP COLUMN "employerPhone",
DROP COLUMN "positionTitle",
ADD COLUMN     "applicationId" TEXT NOT NULL,
ADD COLUMN     "moreDetails" TEXT;

-- AlterTable
ALTER TABLE "emergencyContact" DROP COLUMN "applicantId",
ADD COLUMN     "applicationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "guarantorInformation" DROP COLUMN "applicantId",
ADD COLUMN     "applicationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "nextOfKin" DROP COLUMN "applicantId",
ADD COLUMN     "applicantPersonalDetailsId" TEXT;

-- AlterTable
ALTER TABLE "residentialInformation" DROP COLUMN "applicantId",
DROP COLUMN "city",
DROP COLUMN "currentLandlord",
DROP COLUMN "landlordEmail",
DROP COLUMN "landlordPhoneNumber",
DROP COLUMN "state",
DROP COLUMN "zipcode",
ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "landlordOrAgencyEmail" TEXT NOT NULL,
ADD COLUMN     "landlordOrAgencyName" TEXT NOT NULL,
ADD COLUMN     "landlordOrAgencyPhoneNumber" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- DropTable
DROP TABLE "applicant";

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "propertiesId" TEXT,
    "applicantPersonalDetailsId" TEXT NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicantPersonalDetails" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,

    CONSTRAINT "applicantPersonalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrevAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lengthOfResidence" TEXT NOT NULL,
    "residentialInformationId" TEXT,

    CONSTRAINT "PrevAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applicantPersonalDetails_email_key" ON "applicantPersonalDetails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nextOfKin_applicantPersonalDetailsId_key" ON "nextOfKin"("applicantPersonalDetailsId");

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_propertiesId_fkey" FOREIGN KEY ("propertiesId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_applicantPersonalDetailsId_fkey" FOREIGN KEY ("applicantPersonalDetailsId") REFERENCES "applicantPersonalDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nextOfKin" ADD CONSTRAINT "nextOfKin_applicantPersonalDetailsId_fkey" FOREIGN KEY ("applicantPersonalDetailsId") REFERENCES "applicantPersonalDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrevAddress" ADD CONSTRAINT "PrevAddress_residentialInformationId_fkey" FOREIGN KEY ("residentialInformationId") REFERENCES "residentialInformation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentialInformation" ADD CONSTRAINT "residentialInformation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentialInformation" ADD CONSTRAINT "residentialInformation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantorInformation" ADD CONSTRAINT "guarantorInformation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergencyContact" ADD CONSTRAINT "emergencyContact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentInformation" ADD CONSTRAINT "EmploymentInformation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
