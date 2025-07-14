import { prismaClient } from "..";
import { CommunityVisibility, CommunityInvitation, MembershipStatus, Community, Forum } from "@prisma/client";
import users from "../routes/users";

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
        const forum = await prismaClient.forum.create({
            data: { ...forumData, }
        })
        return forum
    }

    async getForumById(id: string): Promise<Forum | null> {
        return prismaClient.forum.findUnique({ where: { id }, include: { ForumMember: { include: { users: this.userSelect } } } });
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
            prismaClient.community.count({ where: whereClause }),
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

    async addForumMembers(forumId: string, usersIds: string[]) {
        const data = usersIds.map(usersId => ({
            forumId,
            usersId
        }));

        return await prismaClient.forumMember.createMany({
            data,
            skipDuplicates: true // Skip duplicates to avoid errors if a user is already a member
        });
    }


    async isForumMember(forumId: string, userId: string) {
        const member = await this.getMemberInForum(forumId, userId);
        return member && member.status === MembershipStatus.MEMBER;
    }



}

export default new ForumService();