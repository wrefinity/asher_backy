-- Community v2: owner type, discovery audience, join approval, forum discoverability

DO $$ BEGIN
  CREATE TYPE "CommunityOwnerType" AS ENUM ('LANDLORD', 'TENANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityDiscoveryAudience" AS ENUM ('NONE', 'LANDLORDS', 'TENANTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JoinApprovalMode" AS ENUM ('MANUAL', 'AUTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Community"
  ADD COLUMN IF NOT EXISTS "ownerType" "CommunityOwnerType" NOT NULL DEFAULT 'LANDLORD',
  ADD COLUMN IF NOT EXISTS "discoveryAudience" "CommunityDiscoveryAudience" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "joinApprovalMode" "JoinApprovalMode" NOT NULL DEFAULT 'MANUAL';

UPDATE "Community"
SET "discoveryAudience" = 'LANDLORDS'
WHERE "visibility" = 'PUBLIC' AND "ownerType" = 'LANDLORD' AND "discoveryAudience" = 'NONE';

ALTER TABLE "Forum"
  ADD COLUMN IF NOT EXISTS "isDiscoverable" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CommunityJoinRequest" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "usersId" TEXT NOT NULL,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CommunityJoinRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityJoinRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityJoinRequest_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityJoinRequest_communityId_usersId_key"
  ON "CommunityJoinRequest"("communityId", "usersId");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_usersId_idx" ON "CommunityJoinRequest"("usersId");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_status_idx" ON "CommunityJoinRequest"("status");

CREATE TABLE IF NOT EXISTS "ForumJoinRequest" (
  "id" TEXT NOT NULL,
  "forumId" TEXT NOT NULL,
  "usersId" TEXT NOT NULL,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "ForumJoinRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ForumJoinRequest_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ForumJoinRequest_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ForumJoinRequest_forumId_usersId_key"
  ON "ForumJoinRequest"("forumId", "usersId");
CREATE INDEX IF NOT EXISTS "ForumJoinRequest_usersId_idx" ON "ForumJoinRequest"("usersId");
CREATE INDEX IF NOT EXISTS "ForumJoinRequest_status_idx" ON "ForumJoinRequest"("status");

CREATE INDEX IF NOT EXISTS "Community_ownerType_idx" ON "Community"("ownerType");
CREATE INDEX IF NOT EXISTS "Community_discoveryAudience_idx" ON "Community"("discoveryAudience");
CREATE INDEX IF NOT EXISTS "Forum_isDiscoverable_idx" ON "Forum"("isDiscoverable");
