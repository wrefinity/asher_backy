import { MembershipStatus } from "@prisma/client";
import { prismaClient } from "..";

/** Add a tenant user to their landlord's community feed when a lease becomes active. */
export async function ensureTenantInLandlordCommunity(
  landlordId: string,
  tenantUserId: string
): Promise<void> {
  const landlord = await prismaClient.landlords.findUnique({
    where: { id: landlordId },
    select: { userId: true },
  });
  if (!landlord?.userId) return;

  const community = await prismaClient.community.findFirst({
    where: { ownerId: landlord.userId, isDeleted: false },
    select: { id: true },
  });
  if (!community) return;

  await prismaClient.communityMember.upsert({
    where: {
      communityId_usersId: { communityId: community.id, usersId: tenantUserId },
    },
    update: { status: MembershipStatus.MEMBER },
    create: {
      communityId: community.id,
      usersId: tenantUserId,
      status: MembershipStatus.MEMBER,
      role: "MEMBER",
    },
  });

  const memberCount = await prismaClient.communityMember.count({
    where: { communityId: community.id, status: MembershipStatus.MEMBER },
  });

  await prismaClient.community.update({
    where: { id: community.id },
    data: { memberCount },
  });
}
