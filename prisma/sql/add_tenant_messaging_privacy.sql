-- Tenant messaging privacy: opt-in visibility + explicit peer shares
ALTER TABLE "tenants"
ADD COLUMN IF NOT EXISTS "visibleToNeighborTenants" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "tenantMessagingShare" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "peerUserId" TEXT NOT NULL,
  "landlordId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenantMessagingShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenantMessagingShare_ownerUserId_peerUserId_landlordId_key"
ON "tenantMessagingShare"("ownerUserId", "peerUserId", "landlordId");

CREATE INDEX IF NOT EXISTS "tenantMessagingShare_ownerUserId_idx"
ON "tenantMessagingShare"("ownerUserId");

CREATE INDEX IF NOT EXISTS "tenantMessagingShare_peerUserId_idx"
ON "tenantMessagingShare"("peerUserId");
