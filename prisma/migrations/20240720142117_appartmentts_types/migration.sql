/*
  Warnings:

  - The `sittingRoom` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `waitingRoom` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bedrooms` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `kitchen` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bathrooms` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `garages` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `offices` column on the `apartments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "apartments" DROP COLUMN "sittingRoom",
ADD COLUMN     "sittingRoom" INTEGER,
DROP COLUMN "waitingRoom",
ADD COLUMN     "waitingRoom" INTEGER,
DROP COLUMN "bedrooms",
ADD COLUMN     "bedrooms" INTEGER,
DROP COLUMN "kitchen",
ADD COLUMN     "kitchen" INTEGER,
DROP COLUMN "bathrooms",
ADD COLUMN     "bathrooms" INTEGER,
DROP COLUMN "garages",
ADD COLUMN     "garages" INTEGER,
DROP COLUMN "offices",
ADD COLUMN     "offices" INTEGER;
