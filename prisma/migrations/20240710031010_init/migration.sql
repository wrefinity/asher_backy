/*
  Warnings:

  - You are about to drop the column `isRead` on the `Email` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Email" DROP COLUMN "isRead",
ADD COLUMN     "isReadByReciever" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReadBySender" BOOLEAN NOT NULL DEFAULT true;
