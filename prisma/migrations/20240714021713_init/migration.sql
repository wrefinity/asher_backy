/*
  Warnings:

  - The `visibility` column on the `Community` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Community" DROP COLUMN "visibility",
ADD COLUMN     "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC';
