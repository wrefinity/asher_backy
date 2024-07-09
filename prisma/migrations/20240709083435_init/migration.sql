/*
  Warnings:

  - You are about to drop the column `fromUserId` on the `Email` table. All the data in the column will be lost.
  - You are about to drop the column `toUserId` on the `Email` table. All the data in the column will be lost.
  - The `dateOfBirth` column on the `profile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `body` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recieverEmail` to the `Email` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderEmail` to the `Email` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_toUserId_fkey";

-- AlterTable
ALTER TABLE "Email" DROP COLUMN "fromUserId",
DROP COLUMN "toUserId",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "isSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recieverEmail" TEXT NOT NULL,
ADD COLUMN     "senderEmail" TEXT NOT NULL,
ALTER COLUMN "isDraft" SET DEFAULT false;

-- AlterTable
ALTER TABLE "profile" DROP COLUMN "dateOfBirth",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_senderEmail_fkey" FOREIGN KEY ("senderEmail") REFERENCES "users"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_recieverEmail_fkey" FOREIGN KEY ("recieverEmail") REFERENCES "users"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
