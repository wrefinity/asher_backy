/*
  Warnings:

  - You are about to drop the column `communityPostViewsId` on the `CommunityPost` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CommunityPost_communityPostViewsId_key";

-- AlterTable
ALTER TABLE "CommunityPost" DROP COLUMN "communityPostViewsId";
