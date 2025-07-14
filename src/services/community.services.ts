import { prismaClient } from "..";
import { CommunityVisibility, CommunityInvitation, MembershipStatus, Community } from "@prisma/client";
import users from "../routes/users";
class CommunityService {
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
    async createCommunity(userId: string, data: any) {
        const existing = await prismaClient.community.findFirst({
            where: {
                ownerId: userId,
                isDeleted: false,
            },
        });

        if (existing) {
            return existing
        }

        return prismaClient.community.create({
            data: {
                ...data,
                owner: {
                    connect: { id: userId }
                }
            }
        });
    }

    async getLandlordCommunity(userId: string) {
        return await prismaClient.community.findFirst({
            where: {
                ownerId: userId,
                isDeleted: false,
            },
            include: {
                forums: true,
                members: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                                profile: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        profileUrl: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async createCommunityPost(data: any) {
        delete (data.cloudinaryUrls)
        // Verify user is community member
        const membership = await prismaClient.communityMember.findUnique({
            where: {
                communityId_usersId: {
                    communityId: data.communityId,
                    usersId: data.userId
                },
                status: 'MEMBER'
            }
        });

        if (!membership) throw new Error('User is not a community member');

        return prismaClient.communityPost.create({
            data: data,
            include: {
                author: this.userSelect,
            },
        })
    }

    async getSingleCommunityPost(communityId: string, communityPostId: string) {
        return prismaClient.communityPost.findMany({
            where: {
                communityId: communityId,
                id: communityPostId,
            },
            include: {
                author: this.userSelect,
                likes: true,
                views: true,
                comments: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    }
    async getLandlordCommunities(userId: string, page = 1, limit = 10, search?: string) {
        const skip = (page - 1) * limit;

        const whereClause: any = {
            ownerId: userId,
            isDeleted: false, // Ensure we only fetch non-deleted communities
        };

        if (search && search.trim() !== '') {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [communities, totalItems] = await Promise.all([
            prismaClient.community.findMany({
                where: whereClause,
                include: {
                    members: {
                        include: {
                            users: this.userSelect,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),

            prismaClient.community.count({ where: whereClause }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: communities,
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

    async getCommunityById(id: string): Promise<Community | null> {
        return prismaClient.community.findUnique({ where: { id }, include: { members: { include: { users: this.userSelect } } } });
    }

    async getCommunityPostById(communityPostId: string) {
        return prismaClient.communityPost.findUnique({
            where: {
                id: communityPostId,
            },
            include: {
                author: this.userSelect,
                likes: true,
                views: true,
                comments: {
                    include: {
                        author: this.userSelect,
                    },
                },
            },
        })
    }

    async getCommunityPosts(communityId: string, skip: number = 0, take: number = 10) {
        return prismaClient.communityPost.findMany({
            where: {
                communityId: communityId,
            },
            include: {
                author: this.userSelect,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: skip,
            take: take,
        })
    }


    joinCommunity = async (communityId: string, userId: string, code?: string) => {
        const community = await prismaClient.community.findUnique({ where: { id: communityId } });
        if (!community) {
            throw new Error('Community not found');
        }
        if (community.visibility === CommunityVisibility.PRIVATE) {
            const validInvite = await prismaClient.communityInvitation.findFirst({
                where: {
                    communityId,
                    code,
                    expiresAt: { gt: new Date() }
                }
            });

            if (!validInvite) {
                throw new Error('Invalid or expired invitation code');
            }
        }

        return prismaClient.communityMember.create({
            data: {
                community: {
                    connect: { id: communityId }
                },
                users: {
                    connect: { id: userId }
                },
                status: MembershipStatus.MEMBER,
                role: 'MEMBER'
            }
        });
    }

    async getCommunityPostCreator(communityPostId: string, userId: string) {
        return prismaClient.communityPost.findUnique({
            where: {
                id: communityPostId,
                authorId: userId,
            },
            include: {
                author: this.userSelect,
            },
        })
    }

    async allThePostCreatedByMe(userId: string) {
        return prismaClient.communityPost.findMany({
            where: {
                authorId: userId,
            },
            include: {
                author: this.userSelect,
            },
        })
    }

    async deleteCommunityPost(communityPostId: string) {
        return prismaClient.communityPost.update({
            where: {
                id: communityPostId,
            },
            data: {
                isDeleted: true,
            },
        })
    }

    async updateCommunityPost(communityPostId: string, postData: any) {
        return prismaClient.communityPost.update({
            where: {
                id: communityPostId,
            },
            data: postData,
        })
    }

    likeCommunityPost = async (postId: string, userId: string) => {
        return prismaClient.$transaction(async (prisma) => {
            const communityPost = await this.getCommunityPostById(postId);

            if (!communityPost) {
                throw new Error(`Community post with ID ${postId} does not exist.`);
            }


            const existingLike = await prisma.communityPostLike.findUnique({
                where: { postId_usersId: { postId, usersId: userId } }
            });

            if (existingLike) {
                await prisma.communityPostLike.delete({
                    where: { id: existingLike.id },
                });
                await prisma.communityPost.update({
                    where: { id: postId },
                    data: { likesCount: { decrement: 1 } }

                });
                return { liked: false };
            } else {
                await prisma.communityPostLike.create({
                    data: {
                        postId: postId,
                        usersId: userId,
                    },
                });
                await prisma.communityPost.update({
                    where: { id: postId },
                    data: { likesCount: { increment: 1 } }
                });
                return { liked: true };
            }
        });
    }
    sharePost = async (postId: string, userId: string) => {
        return prismaClient.$transaction(async (prisma) => {
            // Record share
            await prisma.communityPostShare.create({
                data: {
                    postId,
                    usersId: userId,
                    sharedAt: new Date()
                }
            });

            // Update counters
            await prisma.communityPost.update({
                where: { id: postId },
                data: {
                    sharesCount: { increment: 1 },
                    engagement: { increment: 3 }
                }
            });
        });
    };

    async viewCommunityPost(postId: string,
        usersId?: string,
        ipAddress?: string,
        userAgent?: string) {
        return prismaClient.$transaction(async (prisma) => {
            const existingView = await prisma.communityPostView.findFirst({
                where: {
                    OR: [
                        { postId, usersId: usersId || undefined },
                        { postId, ipAddress }
                    ]
                }
            });

            if (!existingView) {
                await prisma.communityPostView.create({
                    data: {
                        postId,
                        usersId: usersId,
                        ipAddress,
                        usersAgent: userAgent,
                    },
                });
                await prisma.communityPost.update({
                    where: { id: postId },
                    data: {
                        viewsCount: { increment: 1 },
                        engagement: { increment: 0.5 }
                    }
                });
                return prisma.communityPost.findUnique({
                    where: {
                        id: postId,
                    },
                    include: {
                        author: this.userSelect,
                        likes: true,
                        views: true,
                        comments: true,
                    },
                })
            }
        })
    }

    async getPostLikes(communityPostId: string, page = 1, pageSize = 10) {
        const skip = (pageSize - 1) * pageSize;
        const [likes, totalCount] = await prismaClient.$transaction([
            prismaClient.communityPostLike.findMany({
                where: { postId: communityPostId },
                include: {
                    users: this.userSelect,
                },
            }),
            prismaClient.communityPostLike.count({ where: { postId: communityPostId } })
        ])

        return {
            likes,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
        }
    }

    async getPostViews(communityPostId: string, page = 1, pageSize = 10) {
        const skip = (pageSize - 1) * pageSize;
        const [views, totalCount] = await prismaClient.$transaction([
            prismaClient.communityPostView.findMany({
                where: { postId: communityPostId },
                include: {
                    users: this.userSelect,
                },
            }),
            prismaClient.communityPostView.count({ where: { postId: communityPostId } })
        ])
        return {
            views,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
        }
    }


    async createInvitation(communityId: string, data: {
        maxUses?: number;
        expiresAt?: Date;
    }): Promise<CommunityInvitation> {
        return prismaClient.communityInvitation.create({
            data: {
                communityId,
                code: this.generateInviteCode(),
                ...data,
            },
        });
    }


    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }

    private generateInviteCode(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }




    // async createCommunityInvitationLink(communityId: string, expiresInDays = 7) {
    //     const inviteCode = uuid4()
    //     const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    //     return prismaClient.communityInvitation.create({
    //         data: {
    //             communityId,
    //             inviteCode,
    //             expiresAt,
    //         } as any,
    //     })
    // }

    // async getCommunityInvitationLink(communityId: string) {
    //     const link = await prismaClient.communityInvitation.findFirst({
    //         where: { communityId, expiresAt: { gt: new Date() } },
    //         orderBy: { createdAt: 'desc' }
    //     })
    //     if (!link) {
    //         return this.createCommunityInvitationLink(communityId);
    //     }

    //     return link;
    // }

    async joinCommunityViaInviteLink(inviteCode: string, userId: string) {
        const link = await prismaClient.communityInvitation.findUnique({
            where: { code: inviteCode, expiresAt: { gt: new Date() } },
            include: { community: true }
        })

        if (!link) {
            throw new Error('Invalid invite link');
        }
        const existingMembers = await this.getMemberInCommunity(link.communityId, userId);

        if (existingMembers) {
            throw new Error('User already a member of this community');
        }

        return this.addUserToCommunity(link.communityId, userId);
    }


    async getCommunities({
        visibility,
        search = '',
        page = 1,
        limit = 10,
    }: {
        visibility?: 'PUBLIC' | 'PRIVATE';
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;

        const whereClause: any = { isDeleted: false };

        if (visibility) {
            whereClause.visibility = visibility;
        }

        if (search.trim() !== '') {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [communities, totalItems] = await Promise.all([
            prismaClient.community.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    members: {
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
            data: communities,
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




    async updateCommunity(id: string, communityData: any) {
        return prismaClient.community.update({
            where: { id },
            data: communityData
        })
    }

    async deleteCommunities(ids: string[]) {
        return prismaClient.community.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                isDeleted: true,
            },
        });
    }


    async getCommunityOwner(id: string) {

        return prismaClient.community.findUnique({
            where: { id },
            select: {
                owner: true,
                members: this.userSelect
            }
        })
    }

    async getCommunityMembers(communityId: string) {
        return prismaClient.communityMember.findMany({
            where: {
                communityId,
                status: MembershipStatus.MEMBER,
            },
            include: {
                users: this.userSelect
            }
        })
    }

    async getMemberInCommunity(communityId: string, userId: string) {
        return prismaClient.communityMember.findUnique({
            where: {
                communityId_usersId: {
                    communityId,
                    usersId: userId
                }
            },
            include: {
                users: this.userSelect
            }
        })
    }

    async addUserToCommunity(communityId: string, userId: string) {
        return prismaClient.communityMember.create({
            data: {
                communityId,
                usersId: userId,
                status: MembershipStatus.MEMBER
            },
            include: {
                users: this.userSelect
            }
        })
    }


    async inviteUserToCommunity(communityId: string, invitedUserId: string, inviterId: string) {
        const community = await this.getCommunityById(communityId)
        if (!community) throw new Error("Community not found");

        if (community.ownerId !== inviterId) throw new Error("Only Community Owner can invite Users");

        const existingMember = await this.getMemberInCommunity(community.id, invitedUserId);
        if (existingMember && existingMember.status === MembershipStatus.MEMBER) throw new Error("User already a member of the community");
        if (existingMember && existingMember.status === MembershipStatus.INVITED) throw new Error("User has been invited to the community");


        return prismaClient.communityMember.upsert({
            where: {
                communityId_usersId: {
                    communityId,
                    usersId: invitedUserId,
                }
            },
            update: { status: MembershipStatus.INVITED },
            create: {
                communityId,
                usersId: invitedUserId,
                status: MembershipStatus.INVITED
            }
        })

    }

    async rejectInvitation(communityId: string, userId: string) {
        const invitedUser = await this.getMemberInCommunity(communityId, userId);
        if (!invitedUser || invitedUser.status !== MembershipStatus.INVITED) {
            throw new Error("Invalid invitation");
        }

        return prismaClient.communityMember.update({
            where: {
                id: invitedUser.id,
            },
            data: {
                status: MembershipStatus.REJECTED,
            }
        })
    }

    //clean db
    async removeExpiredInvitationLinks() {
        return prismaClient.communityInvitation.deleteMany({
            where: {
                expiresAt: { lte: new Date() }
            }
        })
    }


    async isCommunityMember(communityId: string, userId: string) {
        const member = await this.getMemberInCommunity(communityId, userId);
        return member && member.status === MembershipStatus.MEMBER;
    }



}

export default new CommunityService();