/*
  Warnings:

  - The values [EXPENSE,REVENUE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `customerid` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `dateadded` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `payerId` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `payerName` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `transactionDesc` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `transactionIndicator` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the column `transactiontype` on the `wallet` table. All the data in the column will be lost.
  - You are about to drop the `transactions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `wallet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `wallet` table without a default value. This is not possible if the table is not empty.
  - Made the column `balance` on table `wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PropertyTransactionsType" AS ENUM ('RENT_DUE', 'RENT_PAYMENT', 'MAINTAINACE_FEE', 'LANDLORD_PAYOUT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('FUNDWALLET', 'WITHDRAWAL', 'MAKEPAYMENT');
ALTER TABLE "Transactions" ALTER COLUMN "transactionType" TYPE "TransactionType_new" USING ("transactionType"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "appartmentTransactionHistory" DROP CONSTRAINT "appartmentTransactionHistory_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_appartmentId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_tenantId_fkey";

-- AlterTable
ALTER TABLE "wallet" DROP COLUMN "amount",
DROP COLUMN "customerid",
DROP COLUMN "dateadded",
DROP COLUMN "payerId",
DROP COLUMN "payerName",
DROP COLUMN "transactionDesc",
DROP COLUMN "transactionId",
DROP COLUMN "transactionIndicator",
DROP COLUMN "transactiontype",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "balance" SET NOT NULL;

-- DropTable
DROP TABLE "transactions";

-- CreateTable
CREATE TABLE "Transactions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "transactionStatus" "TransactionStatus" NOT NULL,
    "walletId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTransactions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "appartmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "transactionStatus" "TransactionStatus" NOT NULL,
    "type" "PropertyTransactionsType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletId" TEXT,

    CONSTRAINT "PropertyTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lnadlordSupportTicket" (
    "id" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "supportTicketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachment" TEXT[],
    "assignedTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lnadlordSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenantSupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supportTicketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachment" TEXT[],
    "assignedTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenantSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transactions_referenceId_key" ON "Transactions"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTransactions_referenceId_key" ON "PropertyTransactions"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");

-- AddForeignKey
ALTER TABLE "appartmentTransactionHistory" ADD CONSTRAINT "appartmentTransactionHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PropertyTransactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTransactions" ADD CONSTRAINT "PropertyTransactions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTransactions" ADD CONSTRAINT "PropertyTransactions_appartmentId_fkey" FOREIGN KEY ("appartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTransactions" ADD CONSTRAINT "PropertyTransactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTransactions" ADD CONSTRAINT "PropertyTransactions_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTransactions" ADD CONSTRAINT "PropertyTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lnadlordSupportTicket" ADD CONSTRAINT "lnadlordSupportTicket_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenantSupportTicket" ADD CONSTRAINT "tenantSupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
