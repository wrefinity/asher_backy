/*
  Warnings:

  - You are about to drop the column `statusId` on the `maintenance` table. All the data in the column will be lost.
  - You are about to drop the column `availabilty` on the `services` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "maintenanceStatus" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'PENDING', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "maintenance" DROP CONSTRAINT "maintenance_statusId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_subcategoryId_fkey";

-- AlterTable
ALTER TABLE "maintenance" DROP COLUMN "statusId",
ADD COLUMN     "status" "maintenanceStatus" NOT NULL DEFAULT 'UNASSIGNED';

-- AlterTable
ALTER TABLE "services" DROP COLUMN "availabilty",
ADD COLUMN     "availability" "vendorAvailability" NOT NULL DEFAULT 'YES',
ALTER COLUMN "categoryId" DROP NOT NULL,
ALTER COLUMN "subcategoryId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Ads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL,
    "locations" TEXT[],
    "bussinessDetails" JSONB NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "startedDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "attachment" TEXT[],
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ads" ADD CONSTRAINT "Ads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
