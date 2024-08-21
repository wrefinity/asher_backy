/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `landlords` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profileId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `city` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zipcode` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `reviewById` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_vendorId_fkey";

-- AlterTable
ALTER TABLE "landlords" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "properties" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "zipcode" SET NOT NULL;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landlordId" TEXT,
ADD COLUMN     "reviewById" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT,
ALTER COLUMN "vendorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "tenantId" TEXT;

-- CreateTable
CREATE TABLE "propertyDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apartmentsId" TEXT,
    "propertyId" TEXT,
    "uploadedBy" TEXT,

    CONSTRAINT "propertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landlords_userId_key" ON "landlords"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_profileId_key" ON "users"("profileId");

-- AddForeignKey
ALTER TABLE "propertyDocument" ADD CONSTRAINT "propertyDocument_apartmentsId_fkey" FOREIGN KEY ("apartmentsId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propertyDocument" ADD CONSTRAINT "propertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propertyDocument" ADD CONSTRAINT "propertyDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewById_fkey" FOREIGN KEY ("reviewById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
