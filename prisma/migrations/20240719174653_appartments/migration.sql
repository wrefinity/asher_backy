-- AlterTable
ALTER TABLE "apartments" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
