/*
  Warnings:

  - You are about to drop the column `transactionId` on the `Transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nextDueDate` to the `PropertyTransactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentFrequency` to the `PropertyTransactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leaseEndDate` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leaseStartDate` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentFrequenct" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Ads" ADD COLUMN     "referenceId" TEXT;

-- AlterTable
ALTER TABLE "PropertyTransactions" ADD COLUMN     "lastPaidDate" TIMESTAMP(3),
ADD COLUMN     "missedPayment" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextDueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentFrequency" "PaymentFrequenct" NOT NULL;

-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "transactionId";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCurrentLease" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leaseEndDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "leaseStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "creditScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentHistory" DOUBLE PRECISION NOT NULL,
    "rentalHistory" DOUBLE PRECISION NOT NULL,
    "maintainanceScore" DOUBLE PRECISION NOT NULL,
    "reviewScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "creditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "vendorId" TEXT NOT NULL,
    "propertyId" TEXT,
    "apartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creditScore_userId_key" ON "creditScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");

-- AddForeignKey
ALTER TABLE "Ads" ADD CONSTRAINT "Ads_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditScore" ADD CONSTRAINT "creditScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
