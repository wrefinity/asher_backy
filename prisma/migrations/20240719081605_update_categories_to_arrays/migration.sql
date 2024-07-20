/*
  Warnings:

  - You are about to drop the column `label` on the `subCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subCategory" DROP COLUMN "label",
ADD COLUMN     "labels" TEXT[];
