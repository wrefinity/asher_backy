import { CommunityOwnerType, MembershipStatus, Forum } from "@prisma/client";
import { prismaClient } from "..";
import { TENANT_MAX_FORUMS } from "./community.access.service";

class ForumService {
    constructor() { }

    private profileSelect = {
        select: {
            id: true,
            firstName: true,
            profileUrl: true,
        }
    }

    private userSelect = {
        select: {
            id: true,
            role: true,
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    profileUrl: true,
                },
            },
        },
    }


    private communitySelect = {
        users: this.userSelect
    }

    async createForum(forumData: any) {
        const community = await prismaClient.community.findUnique({
            where: { id: forumData.communityId, isDeleted: false },
            select: { ownerType: true, id: true },
        });
        if (!community) throw new Error("Community not found");

        if (community.ownerType === CommunityOwnerType.TENANT) {
            const count = await prismaClient.forum.count({
                where: { communityId: community.id, isDeleted: false },
            });
            if (count >= TENANT_MAX_FORUMS) {
                throw new Error(`Tenant communities are limited to ${TENANT_MAX_FORUMS} forums`);
            }
        }

        const forum = await prismaClient.forum.create({
            data: { ...forumData },
        });

        await prismaClient.forumMember.upsert({
            where: {
                forumId_usersId: {
                    forumId: forum.id,
                    usersId: forum.ownerId,
                },
            },
            update: { status: MembershipStatus.MEMBER, role: "OWNER" },
            create: {
                forumId: forum.id,
                usersId: forum.ownerId,
                status: MembershipStatus.MEMBER,
                role: "OWNER",
            },
        });

        await prismaClient.community.update({
            where: { id: community.id },
            data: { forumCount: { increment: 1 } },
        });

        return forum;
    }

    async getForumsVisibleToUser(communityId: string, userId: string, limit = 10) {
        const community = await prismaClient.community.findUnique({
            where: { id: communityId, isDeleted: false },
            select: { ownerId: true },
        });
        if (!community) return [];

        const isOwner = community.ownerId === userId;
        const forums = await prismaClient.forum.findMany({
            where: { communityId, isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                community: { select: { id: true, name: true } },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { firstName: true, lastName: true, profileUrl: true } },
                    },
                },
                ForumMember: {
                    where: isOwner
                        ? undefined
                        : { usersId: userId, status: MembershipStatus.MEMBER },
                    select: { id: true, role: true, users: this.userSelect },
                },
            },
        });

        if (isOwner) {
            return forums.map((forum) => ({
                ...forum,
                ForumMember: Array.isArray(forum.ForumMember) ? forum.ForumMember : [],
            }));
        }

        return forums
            .map((forum) => {
                const isMember = (forum as { ForumMember?: { id: string }[] }).ForumMember?.length;
                const { ForumMember, ...rest } = forum as typeof forum & { ForumMember?: unknown };
                return {
                    ...rest,
                    canAccess: Boolean(isMember),
                    isDiscoverable: forum.isDiscoverable,
                };
            })
            .filter((forum) => forum.canAccess || forum.isDiscoverable);
    }

    async getForumById(id: string): Promise<Forum | null> {
        return prismaClient.forum.findUnique({ where: { id }, include: { ForumMember: { include: { users: this.userSelect } } } });
    }

    async getRecentForums(communityId, limit: number = 10) {
        return prismaClient.forum.findMany({
            where: {
                communityId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            include: {
                community: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                profileUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }


    joinForum = async (forumId: string, userId: string, code?: string) => {
        const forum = await prismaClient.forum.findUnique({ where: { id: forumId } });
        if (!forum) {
            throw new Error('Forum not found');
        }
        return prismaClient.forumMember.create({
            data: {
                forum: {
                    connect: { id: forumId }
                },
                users: {
                    connect: { id: userId }
                },
                status: MembershipStatus.MEMBER,
                role: 'MEMBER'
            }
        });
    }




    async getForums({
        search = '',
        page = 1,
        limit = 10,
    }: {
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;

        const whereClause: any = { isDeleted: false };


        if (search.trim() !== '') {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [forums, totalItems] = await Promise.all([
            prismaClient.forum.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    ForumMember: {
                        include: {
                            users: this.userSelect,
                        },
                    },
                },
                skip,
                take: limit,
            }),
            prismaClient.forum.count({ where: whereClause }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: forums,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async getForumsForUser(
        userId: string,
        {
            search = '',
            page = 1,
            limit = 10,
        }: {
            search?: string;
            page?: number;
            limit?: number;
        }
    ) {
        const skip = (page - 1) * limit;

        const whereClause: any = {
            isDeleted: false,
            OR: [
                { ownerId: userId },
                { community: { ownerId: userId } },
                {
                    ForumMember: {
                        some: { usersId: userId, status: MembershipStatus.MEMBER },
                    },
                },
            ],
        };

        if (search.trim() !== '') {
            whereClause.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ],
                },
            ];
        }

        const [forums, totalItems] = await Promise.all([
            prismaClient.forum.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    ForumMember: {
                        include: {
                            users: this.userSelect,
                        },
                    },
                },
                skip,
                take: limit,
            }),
            prismaClient.forum.count({ where: whereClause }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: forums,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }




    async updateForum(id: string, forumData: any) {
        return prismaClient.forum.update({
            where: { id },
            data: forumData
        })
    }

    async deleteForums(ids: string[]) {
        return prismaClient.forum.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                isDeleted: true,
            },
        });
    }

    async getForumMembers(forumId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [members, total] = await Promise.all([
            prismaClient.forumMember.findMany({
                where: {
                    forumId,
                    status: MembershipStatus.MEMBER,
                },
                include: {
                    users: this.userSelect,
                },
                skip,
                take: limit,
                orderBy: {
                    joinedAt: 'desc'
                }
            }),

            prismaClient.forumMember.count({
                where: {
                    forumId,
                    status: MembershipStatus.MEMBER,
                },
            })
        ]);

        return {
            data: members,
            pagination: {
                totalItems: total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                perPage: limit,
            }
        };
    }

    async getMemberInForum(forumId: string, userId: string) {
        return prismaClient.forumMember.findUnique({
            where: {
                forumId_usersId: {
                    forumId,
                    usersId: userId
                }
            },
            include: {
                users: this.userSelect
            }
        })
    }

    async removeForumMembers(forumId: string, userIds: string[]) {
        const result = await prismaClient.forumMember.deleteMany({
            where: {
                forumId,
                usersId: { in: userIds },
            },
        });

        return {
            deletedCount: result.count,
            message: `${result.count} member(s) removed from the forum.`,
        };
    }

    async inviteUserToForum(forumId: string, invitedUserId: string, inviterId: string) {
        const forum = await this.getForumById(forumId)
        if (!forum) throw new Error("Forum not found");

        const existingMember = await this.getMemberInForum(forum.id, invitedUserId);
        if (existingMember && existingMember.status === MembershipStatus.MEMBER) throw new Error("User already a member of the forum");
        if (existingMember && existingMember.status === MembershipStatus.INVITED) throw new Error("User has been invited to the forum");

        return prismaClient.forumMember.upsert({
            where: {
                forumId_usersId: {
                    forumId,
                    usersId: invitedUserId,
                }
            },
            update: { status: MembershipStatus.INVITED },
            create: {
                forumId,
                usersId: invitedUserId,
                status: MembershipStatus.INVITED
            }
        })

    }

    async rejectInvitation(forumId: string, userId: string) {
        const invitedUser = await this.getMemberInForum(forumId, userId);
        if (!invitedUser || invitedUser.status !== MembershipStatus.INVITED) {
            throw new Error("Invalid invitation");
        }

        return prismaClient.forumMember.update({
            where: {
                id: invitedUser.id,
            },
            data: {
                status: MembershipStatus.REJECTED,
            }
        })
    }

    async addForumMembers(forumId: string, usersIds: string[], actorId: string) {
        const forum = await prismaClient.forum.findUnique({
            where: { id: forumId },
            include: { community: true },
        });
        if (!forum) throw new Error("Forum not found");
        if (forum.community.ownerId !== actorId && forum.ownerId !== actorId) {
            throw new Error("Only the community or forum owner can add forum members");
        }

        const communityMembers = await prismaClient.communityMember.findMany({
            where: {
                communityId: forum.communityId,
                usersId: { in: usersIds },
                status: MembershipStatus.MEMBER,
            },
            select: { usersId: true },
        });
        const allowed = new Set(communityMembers.map((m) => m.usersId));
        const eligible = usersIds.filter((id) => allowed.has(id));
        if (eligible.length === 0) {
            throw new Error("Users must be community members before joining a forum");
        }

        const data = eligible.map((usersId) => ({
            forumId,
            usersId,
            status: MembershipStatus.MEMBER,
            role: "MEMBER",
        }));

        return await prismaClient.forumMember.createMany({
            data,
            skipDuplicates: true,
        });
    }


    async isForumMember(forumId: string, userId: string) {
        const member = await this.getMemberInForum(forumId, userId);
        return member && member.status === MembershipStatus.MEMBER;
    }



}

export default new ForumService();
