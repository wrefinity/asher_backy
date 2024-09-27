/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");
