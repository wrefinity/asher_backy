import {
  CommunityDiscoveryAudience,
  CommunityOwnerType,
  MembershipStatus,
  userRoles,
} from "@prisma/client";
import { prismaClient } from "..";

export const TENANT_MAX_FORUMS = 5;

type UserWithRoles = { id: string; role: userRoles[] };

export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  return prismaClient.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
}

export function userHasRole(user: UserWithRoles | null, role: userRoles): boolean {
  return Boolean(user?.role?.includes(role));
}

export function isLandlordUser(user: UserWithRoles | null): boolean {
  return userHasRole(user, userRoles.LANDLORD);
}

export function isTenantUser(user: UserWithRoles | null): boolean {
  return userHasRole(user, userRoles.TENANT);
}

export function resolveOwnerTypeFromRoles(roles: userRoles[]): CommunityOwnerType {
  if (roles.includes(userRoles.LANDLORD)) return CommunityOwnerType.LANDLORD;
  if (roles.includes(userRoles.TENANT)) return CommunityOwnerType.TENANT;
  throw new Error("Only landlords and tenants can own a community");
}

export function resolveDiscoveryAudience(
  visibility: "PUBLIC" | "PRIVATE",
  ownerType: CommunityOwnerType
): CommunityDiscoveryAudience {
  if (visibility !== "PUBLIC") return CommunityDiscoveryAudience.NONE;
  return ownerType === CommunityOwnerType.LANDLORD
    ? CommunityDiscoveryAudience.LANDLORDS
    : CommunityDiscoveryAudience.TENANTS;
}

export function canViewerDiscoverCommunity(
  viewer: UserWithRoles | null,
  discoveryAudience: CommunityDiscoveryAudience
): boolean {
  if (discoveryAudience === CommunityDiscoveryAudience.NONE) return false;
  if (discoveryAudience === CommunityDiscoveryAudience.LANDLORDS) {
    return isLandlordUser(viewer);
  }
  if (discoveryAudience === CommunityDiscoveryAudience.TENANTS) {
    return isTenantUser(viewer);
  }
  return false;
}

async function hasActiveLeaseWithLandlordOwner(
  userId: string,
  landlordUserId: string
): Promise<boolean> {
  const communityOwner = await prismaClient.users.findUnique({
    where: { id: landlordUserId },
    include: { landlords: true },
  });
  const landlordId = communityOwner?.landlords?.id;
  if (!landlordId) return false;

  const lease = await prismaClient.tenants.findFirst({
    where: {
      userId,
      landlordId,
      isCurrentLease: true,
    },
    select: { id: true },
  });
  return Boolean(lease);
}

/** General community feed — owner or active community member. */
export async function canAccessCommunityFeed(
  userId: string,
  communityId: string
): Promise<boolean> {
  const community = await prismaClient.community.findUnique({
    where: { id: communityId, isDeleted: false },
    select: {
      id: true,
      ownerId: true,
      ownerType: true,
    },
  });
  if (!community) return false;
  if (community.ownerId === userId) return true;

  const membership = await prismaClient.communityMember.findUnique({
    where: {
      communityId_usersId: { communityId, usersId: userId },
    },
  });
  if (!membership || membership.status !== MembershipStatus.MEMBER) return false;

  const user = await getUserWithRoles(userId);
  if (!user) return false;

  if (community.ownerType === CommunityOwnerType.TENANT) {
    return isTenantUser(user);
  }

  // Landlord-owned community
  if (isLandlordUser(user)) {
    return true;
  }

  if (isTenantUser(user)) {
    return hasActiveLeaseWithLandlordOwner(userId, community.ownerId);
  }

  return false;
}

/** Forum content — owner or explicit forum member only. */
export async function canAccessForum(
  userId: string,
  forumId: string
): Promise<boolean> {
  const forum = await prismaClient.forum.findUnique({
    where: { id: forumId, isDeleted: false },
    select: { id: true, ownerId: true, communityId: true },
  });
  if (!forum) return false;
  if (forum.ownerId === userId) return true;

  const community = await prismaClient.community.findUnique({
    where: { id: forum.communityId },
    select: { ownerId: true },
  });
  if (community?.ownerId === userId) return true;

  const forumMember = await prismaClient.forumMember.findUnique({
    where: {
      forumId_usersId: { forumId, usersId: userId },
    },
  });
  return Boolean(forumMember && forumMember.status === MembershipStatus.MEMBER);
}

export async function canRequestCommunityJoin(
  userId: string,
  communityId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const community = await prismaClient.community.findUnique({
    where: { id: communityId, isDeleted: false },
  });
  if (!community) return { allowed: false, reason: "Community not found" };
  if (community.ownerId === userId) {
    return { allowed: false, reason: "You own this community" };
  }

  const viewer = await getUserWithRoles(userId);
  if (!canViewerDiscoverCommunity(viewer, community.discoveryAudience)) {
    return { allowed: false, reason: "This community is not discoverable for your role" };
  }

  const existingMember = await prismaClient.communityMember.findUnique({
    where: { communityId_usersId: { communityId, usersId: userId } },
  });
  if (existingMember?.status === MembershipStatus.MEMBER) {
    return { allowed: false, reason: "Already a member" };
  }

  return { allowed: true };
}

export async function canRequestForumJoin(
  userId: string,
  forumId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const forum = await prismaClient.forum.findUnique({
    where: { id: forumId, isDeleted: false },
    select: { id: true, communityId: true, isDiscoverable: true },
  });
  if (!forum) return { allowed: false, reason: "Forum not found" };
  if (!forum.isDiscoverable) {
    return { allowed: false, reason: "This forum is not discoverable" };
  }

  const inCommunity = await canAccessCommunityFeed(userId, forum.communityId);
  if (!inCommunity) {
    return { allowed: false, reason: "Join the community before requesting this forum" };
  }

  const existing = await prismaClient.forumMember.findUnique({
    where: { forumId_usersId: { forumId, usersId: userId } },
  });
  if (existing?.status === MembershipStatus.MEMBER) {
    return { allowed: false, reason: "Already a forum member" };
  }

  return { allowed: true };
}

export async function assertCommunityFeedAccess(
  userId: string,
  communityId: string
): Promise<void> {
  const ok = await canAccessCommunityFeed(userId, communityId);
  if (!ok) {
    throw new Error("You do not have access to this community");
  }
}

export async function assertForumAccess(userId: string, forumId: string): Promise<void> {
  const ok = await canAccessForum(userId, forumId);
  if (!ok) {
    throw new Error("You do not have access to this forum");
  }
}

export async function getForumIdForThread(threadId: string): Promise<string | null> {
  const thread = await prismaClient.discussionThread.findUnique({
    where: { id: threadId },
    select: { forumId: true },
  });
  return thread?.forumId ?? null;
}

export async function getForumIdForComment(commentId: string): Promise<string | null> {
  const comment = await prismaClient.discussionComment.findUnique({
    where: { id: commentId },
    select: { thread: { select: { forumId: true } } },
  });
  return comment?.thread?.forumId ?? null;
}

export async function getForumIdForPollOption(optionId: string): Promise<string | null> {
  const option = await prismaClient.discussionThreadPollOption.findUnique({
    where: { id: optionId },
    select: { poll: { select: { thread: { select: { forumId: true } } } } },
  });
  return option?.poll?.thread?.forumId ?? null;
}

export async function assertForumAccessForThread(userId: string, threadId: string): Promise<string> {
  const forumId = await getForumIdForThread(threadId);
  if (!forumId) throw new Error("Thread not found");
  await assertForumAccess(userId, forumId);
  return forumId;
}

export async function assertForumAccessForComment(userId: string, commentId: string): Promise<string> {
  const forumId = await getForumIdForComment(commentId);
  if (!forumId) throw new Error("Comment not found");
  await assertForumAccess(userId, forumId);
  return forumId;
}

export async function assertForumAccessForPollOption(userId: string, optionId: string): Promise<string> {
  const forumId = await getForumIdForPollOption(optionId);
  if (!forumId) throw new Error("Poll option not found");
  await assertForumAccess(userId, forumId);
  return forumId;
}
