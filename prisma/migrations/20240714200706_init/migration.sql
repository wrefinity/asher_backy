-- CreateTable
CREATE TABLE "CommunityInvitationLink" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityInvitationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityInvitationLink_inviteCode_key" ON "CommunityInvitationLink"("inviteCode");

-- AddForeignKey
ALTER TABLE "CommunityInvitationLink" ADD CONSTRAINT "CommunityInvitationLink_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
