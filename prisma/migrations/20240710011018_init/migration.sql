/*
  Warnings:

  - You are about to drop the column `receiverEmail` on the `Email` table. All the data in the column will be lost.
  - Added the required column `recieverEmail` to the `Email` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_receiverEmail_fkey";

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "receiverEmail",
ADD COLUMN     "recieverEmail" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_recieverEmail_fkey" FOREIGN KEY ("recieverEmail") REFERENCES "users"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
