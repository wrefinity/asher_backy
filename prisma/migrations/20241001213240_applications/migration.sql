/*
  Warnings:

  - A unique constraint covering the columns `[maintenanceId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chatRoomId]` on the table `maintenance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "maintenanceId" TEXT;

-- AlterTable
ALTER TABLE "maintenance" ADD COLUMN     "chatRoomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_maintenanceId_key" ON "ChatRoom"("maintenanceId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_chatRoomId_key" ON "maintenance"("chatRoomId");

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
