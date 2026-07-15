import {
  JoinApprovalMode,
  JoinRequestStatus,
  MembershipStatus,
} from "@prisma/client";
import { prismaClient } from "..";
import {
  canRequestCommunityJoin,
  canRequestForumJoin,
} from "./community.access.service";

class CommunityJoinService {
  async requestCommunityJoin(userId: string, communityId: string, message?: string) {
    const gate = await canRequestCommunityJoin(userId, communityId);
    if (!gate.allowed) throw new Error(gate.reason || "Cannot request to join");

    const community = await prismaClient.community.findUnique({
      where: { id: communityId },
      select: { joinApprovalMode: true },
    });
    if (!community) throw new Error("Community not found");

    const existing = await prismaClient.communityJoinRequest.findUnique({
      where: { communityId_usersId: { communityId, usersId: userId } },
    });
    if (existing?.status === JoinRequestStatus.PENDING) {
      return existing;
    }

    if (community.joinApprovalMode === JoinApprovalMode.AUTO) {
      await prismaClient.communityMember.upsert({
        where: { communityId_usersId: { communityId, usersId: userId } },
        update: { status: MembershipStatus.MEMBER },
        create: {
          communityId,
          usersId: userId,
          status: MembershipStatus.MEMBER,
          role: "MEMBER",
        },
      });
      return prismaClient.communityJoinRequest.upsert({
        where: { communityId_usersId: { communityId, usersId: userId } },
        update: {
          status: JoinRequestStatus.APPROVED,
          reviewedAt: new Date(),
          message,
        },
        create: {
          communityId,
          usersId: userId,
          status: JoinRequestStatus.APPROVED,
          reviewedAt: new Date(),
          message,
        },
      });
    }

    return prismaClient.communityJoinRequest.upsert({
      where: { communityId_usersId: { communityId, usersId: userId } },
      update: { status: JoinRequestStatus.PENDING, message },
      create: {
        communityId,
        usersId: userId,
        status: JoinRequestStatus.PENDING,
        message,
      },
    });
  }

  async reviewCommunityJoinRequest(
    ownerId: string,
    requestId: string,
    approve: boolean
  ) {
    const request = await prismaClient.communityJoinRequest.findUnique({
      where: { id: requestId },
      include: { community: true },
    });
    if (!request) throw new Error("Join request not found");
    if (request.community.ownerId !== ownerId) {
      throw new Error("Only the community owner can review join requests");
    }
    if (request.status !== JoinRequestStatus.PENDING) {
      throw new Error("Join request already reviewed");
    }

    const status = approve ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED;
    const updated = await prismaClient.communityJoinRequest.update({
      where: { id: requestId },
      data: { status, reviewedAt: new Date() },
    });

    if (approve) {
      await prismaClient.communityMember.upsert({
        where: {
          communityId_usersId: {
            communityId: request.communityId,
            usersId: request.usersId,
          },
        },
        update: { status: MembershipStatus.MEMBER },
        create: {
          communityId: request.communityId,
          usersId: request.usersId,
          status: MembershipStatus.MEMBER,
          role: "MEMBER",
        },
      });
    }

    return updated;
  }

  async listCommunityJoinRequests(ownerId: string, communityId: string) {
    const community = await prismaClient.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });
    if (!community || community.ownerId !== ownerId) {
      throw new Error("Only the community owner can view join requests");
    }

    return prismaClient.communityJoinRequest.findMany({
      where: { communityId, status: JoinRequestStatus.PENDING },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, profileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async discoverCommunities(
    userId: string,
    page = 1,
    limit = 20,
    search = ""
  ) {
    const user = await prismaClient.users.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) return { data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };

    const { isLandlordUser, isTenantUser } = await import("./community.access.service");
    const audience = isLandlordUser(user)
      ? "LANDLORDS"
      : isTenantUser(user)
        ? "TENANTS"
        : null;
    if (!audience) return { data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      isDeleted: false,
      discoveryAudience: audience,
      NOT: { ownerId: userId },
      members: { none: { usersId: userId, status: MembershipStatus.MEMBER } },
    };
    if (search.trim()) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      prismaClient.community.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          avatarUrl: true,
          bannerUrl: true,
          ownerType: true,
          discoveryAudience: true,
          joinApprovalMode: true,
          memberCount: true,
          forumCount: true,
          postCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.community.count({ where }),
    ]);

    return {
      data,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async requestForumJoin(userId: string, forumId: string, message?: string) {
    const gate = await canRequestForumJoin(userId, forumId);
    if (!gate.allowed) throw new Error(gate.reason || "Cannot request forum access");

    const existing = await prismaClient.forumJoinRequest.findUnique({
      where: { forumId_usersId: { forumId, usersId: userId } },
    });
    if (existing?.status === JoinRequestStatus.PENDING) return existing;

    return prismaClient.forumJoinRequest.upsert({
      where: { forumId_usersId: { forumId, usersId: userId } },
      update: { status: JoinRequestStatus.PENDING, message },
      create: {
        forumId,
        usersId: userId,
        status: JoinRequestStatus.PENDING,
        message,
      },
    });
  }

  async reviewForumJoinRequest(ownerId: string, requestId: string, approve: boolean) {
    const request = await prismaClient.forumJoinRequest.findUnique({
      where: { id: requestId },
      include: { forum: { include: { community: true } } },
    });
    if (!request) throw new Error("Forum join request not found");
    if (request.forum.community.ownerId !== ownerId && request.forum.ownerId !== ownerId) {
      throw new Error("Only the community or forum owner can review forum join requests");
    }
    if (request.status !== JoinRequestStatus.PENDING) {
      throw new Error("Join request already reviewed");
    }

    const status = approve ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED;
    const updated = await prismaClient.forumJoinRequest.update({
      where: { id: requestId },
      data: { status, reviewedAt: new Date() },
    });

    if (approve) {
      await prismaClient.forumMember.upsert({
        where: { forumId_usersId: { forumId: request.forumId, usersId: request.usersId } },
        update: { status: MembershipStatus.MEMBER },
        create: {
          forumId: request.forumId,
          usersId: request.usersId,
          status: MembershipStatus.MEMBER,
          role: "MEMBER",
        },
      });
    }

    return updated;
  }

  async listForumJoinRequests(ownerId: string, forumId: string) {
    const forum = await prismaClient.forum.findUnique({
      where: { id: forumId },
      include: { community: true },
    });
    if (!forum) throw new Error("Forum not found");
    if (forum.community.ownerId !== ownerId && forum.ownerId !== ownerId) {
      throw new Error("Only the owner can view forum join requests");
    }

    return prismaClient.forumJoinRequest.findMany({
      where: { forumId, status: JoinRequestStatus.PENDING },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, profileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new CommunityJoinService();
