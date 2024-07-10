/*
  Warnings:

  - The primary key for the `ChatRoom` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Community` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CommunityPost` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CommunityPostLikes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CommunityPostViews` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Email` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EmploymentInformation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Rating` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `agency` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `agents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `apartments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `appartmentTransactionHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `applicant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `balances` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `document` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `emergencyContact` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `guarantorInformation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `inventory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `landlords` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `nextOfKin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `profile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `properties` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `residentialInformation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tenantPaymentHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tenants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `wallet` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_user1Id_fkey";

-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_user2Id_fkey";

-- DropForeignKey
ALTER TABLE "Comments" DROP CONSTRAINT "Comments_parentCommentId_fkey";

-- DropForeignKey
ALTER TABLE "Comments" DROP CONSTRAINT "Comments_postId_fkey";

-- DropForeignKey
ALTER TABLE "Comments" DROP CONSTRAINT "Comments_userId_fkey";

-- DropForeignKey
ALTER TABLE "Community" DROP CONSTRAINT "Community_communityOwnerId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPostLikes" DROP CONSTRAINT "CommunityPostLikes_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPostLikes" DROP CONSTRAINT "CommunityPostLikes_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPostViews" DROP CONSTRAINT "CommunityPostViews_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPostViews" DROP CONSTRAINT "CommunityPostViews_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentInformation" DROP CONSTRAINT "EmploymentInformation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatRoomId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_ratedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_userId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_userId_fkey";

-- DropForeignKey
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_tenantsId_fkey";

-- DropForeignKey
ALTER TABLE "appartmentTransactionHistory" DROP CONSTRAINT "appartmentTransactionHistory_apartmentsId_fkey";

-- DropForeignKey
ALTER TABLE "appartmentTransactionHistory" DROP CONSTRAINT "appartmentTransactionHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "appartmentTransactionHistory" DROP CONSTRAINT "appartmentTransactionHistory_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "applicant" DROP CONSTRAINT "applicant_userId_fkey";

-- DropForeignKey
ALTER TABLE "balances" DROP CONSTRAINT "balances_userId_fkey";

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "emergencyContact" DROP CONSTRAINT "emergencyContact_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "guarantorInformation" DROP CONSTRAINT "guarantorInformation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_apartmentId_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_propertiesId_fkey";

-- DropForeignKey
ALTER TABLE "landlords" DROP CONSTRAINT "landlords_userId_fkey";

-- DropForeignKey
ALTER TABLE "nextOfKin" DROP CONSTRAINT "nextOfKin_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_landlordId_fkey";

-- DropForeignKey
ALTER TABLE "residentialInformation" DROP CONSTRAINT "residentialInformation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "tenantPaymentHistory" DROP CONSTRAINT "tenantPaymentHistory_apartmentsId_fkey";

-- DropForeignKey
ALTER TABLE "tenantPaymentHistory" DROP CONSTRAINT "tenantPaymentHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_agentId_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_landlordId_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_appartmentId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_profileId_fkey";

-- AlterTable
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user1Id" SET DATA TYPE TEXT,
ALTER COLUMN "user2Id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ChatRoom_id_seq";

-- AlterTable
ALTER TABLE "Comments" DROP CONSTRAINT "Comments_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "parentCommentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Comments_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Comments_id_seq";

-- AlterTable
ALTER TABLE "Community" DROP CONSTRAINT "Community_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "communityOwnerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Community_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Community_id_seq";

-- AlterTable
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "communityId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "communityPostViewsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CommunityPost_id_seq";

-- AlterTable
ALTER TABLE "CommunityPostLikes" DROP CONSTRAINT "CommunityPostLikes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "CommunityPostLikes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CommunityPostLikes_id_seq";

-- AlterTable
ALTER TABLE "CommunityPostViews" DROP CONSTRAINT "CommunityPostViews_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "postId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "CommunityPostViews_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CommunityPostViews_id_seq";

-- AlterTable
ALTER TABLE "Email" DROP CONSTRAINT "Email_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Email_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Email_id_seq";

-- AlterTable
ALTER TABLE "EmploymentInformation" DROP CONSTRAINT "EmploymentInformation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EmploymentInformation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EmploymentInformation_id_seq";

-- AlterTable
ALTER TABLE "Message" DROP CONSTRAINT "Message_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "senderId" SET DATA TYPE TEXT,
ALTER COLUMN "receiverId" SET DATA TYPE TEXT,
ALTER COLUMN "chatRoomId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Message_id_seq";

-- AlterTable
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "propertyId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "ratedByUserId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Rating_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Rating_id_seq";

-- AlterTable
ALTER TABLE "VerificationToken" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "agency" DROP CONSTRAINT "agency_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "agency_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "agency_id_seq";

-- AlterTable
ALTER TABLE "agents" DROP CONSTRAINT "agents_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "agencyId" SET DATA TYPE TEXT,
ALTER COLUMN "propertyId" SET DATA TYPE TEXT,
ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "agents_id_seq";

-- AlterTable
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "propertyId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "apartments_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "apartments_id_seq";

-- AlterTable
ALTER TABLE "appartmentTransactionHistory" DROP CONSTRAINT "appartmentTransactionHistory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "apartmentsId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "transactionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "appartmentTransactionHistory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "appartmentTransactionHistory_id_seq";

-- AlterTable
ALTER TABLE "applicant" DROP CONSTRAINT "applicant_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "applicant_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "applicant_id_seq";

-- AlterTable
ALTER TABLE "balances" DROP CONSTRAINT "balances_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "balances_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "balances_id_seq";

-- AlterTable
ALTER TABLE "document" DROP CONSTRAINT "document_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "document_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "document_id_seq";

-- AlterTable
ALTER TABLE "emergencyContact" DROP CONSTRAINT "emergencyContact_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "emergencyContact_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "emergencyContact_id_seq";

-- AlterTable
ALTER TABLE "guarantorInformation" DROP CONSTRAINT "guarantorInformation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "guarantorInformation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "guarantorInformation_id_seq";

-- AlterTable
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "apartmentId" SET DATA TYPE TEXT,
ALTER COLUMN "propertiesId" SET DATA TYPE TEXT,
ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "inventory_id_seq";

-- AlterTable
ALTER TABLE "landlords" DROP CONSTRAINT "landlords_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "landlords_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "landlords_id_seq";

-- AlterTable
ALTER TABLE "nextOfKin" DROP CONSTRAINT "nextOfKin_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "nextOfKin_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "nextOfKin_id_seq";

-- AlterTable
ALTER TABLE "profile" DROP CONSTRAINT "profile_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "profile_id_seq";

-- AlterTable
ALTER TABLE "properties" DROP CONSTRAINT "properties_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "landlordId" SET DATA TYPE TEXT,
ALTER COLUMN "agencyId" SET DATA TYPE TEXT,
ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "properties_id_seq";

-- AlterTable
ALTER TABLE "residentialInformation" DROP CONSTRAINT "residentialInformation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "residentialInformation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "residentialInformation_id_seq";

-- AlterTable
ALTER TABLE "tenantPaymentHistory" DROP CONSTRAINT "tenantPaymentHistory_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "apartmentsId" SET DATA TYPE TEXT,
ADD CONSTRAINT "tenantPaymentHistory_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "tenantPaymentHistory_id_seq";

-- AlterTable
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "landlordId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "agentId" SET DATA TYPE TEXT,
ALTER COLUMN "propertyId" SET DATA TYPE TEXT,
ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "tenants_id_seq";

-- AlterTable
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "propertyId" SET DATA TYPE TEXT,
ALTER COLUMN "appartmentId" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "transactions_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "profileId" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AlterTable
ALTER TABLE "wallet" DROP CONSTRAINT "wallet_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "payerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "wallet_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "wallet_id_seq";

-- AddForeignKey
ALTER TABLE "landlords" ADD CONSTRAINT "landlords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_tenantsId_fkey" FOREIGN KEY ("tenantsId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartmentTransactionHistory" ADD CONSTRAINT "appartmentTransactionHistory_apartmentsId_fkey" FOREIGN KEY ("apartmentsId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartmentTransactionHistory" ADD CONSTRAINT "appartmentTransactionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartmentTransactionHistory" ADD CONSTRAINT "appartmentTransactionHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_propertiesId_fkey" FOREIGN KEY ("propertiesId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_appartmentId_fkey" FOREIGN KEY ("appartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedByUserId_fkey" FOREIGN KEY ("ratedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenantPaymentHistory" ADD CONSTRAINT "tenantPaymentHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenantPaymentHistory" ADD CONSTRAINT "tenantPaymentHistory_apartmentsId_fkey" FOREIGN KEY ("apartmentsId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "landlords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_communityOwnerId_fkey" FOREIGN KEY ("communityOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLikes" ADD CONSTRAINT "CommunityPostLikes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLikes" ADD CONSTRAINT "CommunityPostLikes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostViews" ADD CONSTRAINT "CommunityPostViews_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostViews" ADD CONSTRAINT "CommunityPostViews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant" ADD CONSTRAINT "applicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nextOfKin" ADD CONSTRAINT "nextOfKin_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residentialInformation" ADD CONSTRAINT "residentialInformation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantorInformation" ADD CONSTRAINT "guarantorInformation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergencyContact" ADD CONSTRAINT "emergencyContact_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentInformation" ADD CONSTRAINT "EmploymentInformation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
