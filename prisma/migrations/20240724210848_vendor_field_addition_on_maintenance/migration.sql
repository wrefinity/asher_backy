-- CreateEnum
CREATE TYPE "chatType" AS ENUM ('MAINTENANCE', 'APPLICATION', 'SUPPORT');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "chatType" "chatType";

-- AlterTable
ALTER TABLE "maintenance" ADD COLUMN     "vendorId" TEXT;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
