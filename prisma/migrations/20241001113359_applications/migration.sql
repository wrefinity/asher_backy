-- AlterTable
ALTER TABLE "application" ADD COLUMN     "tenantId" TEXT;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
