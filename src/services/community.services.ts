import { prismaClient } from "..";
import { Community, PrismaClient } from "@prisma/client";
import { CommunityVisibility, CommunityInvitation, MembershipStatus } from "@prisma/client"


class CommunityService {
    protected inclusion;

    constructor() {
        this.inclusion = {
            subCategory: true
        }
    }
    createPost = async (data: {
        title: string;
        content: string;
        communityId: string;
        userId: string;
        category: string;
        tags?: string[];
    }) => {
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
            data: {
                title: data.title,
                content: data.content,
                communityId:  data.communityId,
                authorId: data.userId,
                tags: data.tags || [],

                ...(data.title && { slug: this.generateSlug(data.title) }),
            },
            include: { author: true }
        });
    }

    async getCommunity(slug: string): Promise<Community | null> {
        return prismaClient.community.findUnique({ where: { slug } });
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

    likePost = async (postId: string, userId: string) => {
        return prismaClient.$transaction(async (tx) => {
            const existingLike = await tx.communityPostLike.findUnique({
                where: { postId_usersId: { postId, usersId: userId } }
            });

            if (!existingLike) {
                // Create like
                await tx.communityPostLike.create({
                    data: { postId, usersId: userId }
                });

                // Update post counters
                await tx.communityPost.update({
                    where: { id: postId },
                    data: {
                        likesCount: { increment: 1 },
                        engagement: { increment: 2 }
                    }
                });

                // Send notification to post owner
                // const post = await tx.communityPost.findUnique({
                //     where: { id: postId },
                //     select: { userId: true }
                // });

                // if (post && post.userId !== userId) {
                //     await sendNotification(
                //         post.userId,
                //         'POST_LIKE',
                //         `${userId} liked your post`,
                //         { postId }
                //     );
                // }
            }
        });
    };

    recordView = async (
        postId: string,
        usersId?: string,
        ipAddress?: string,
        userAgent?: string
    ) => {
        // Prevent duplicate views from same user/IP
        const existingView = await prismaClient.communityPostView.findFirst({
            where: {
                OR: [
                    { postId, usersId: usersId || undefined },
                    { postId, ipAddress }
                ]
            }
        });

        if (!existingView) {
            await prismaClient.$transaction(async (tx) => {
                // Record view
                await tx.communityPostView.create({
                    data: {
                        postId,
                        usersId: usersId,
                        ipAddress,
                        usersAgent: userAgent,
                    }
                });

                // Update counters
                await tx.communityPost.update({
                    where: { id: postId },
                    data: {
                        viewsCount: { increment: 1 },
                        engagement: { increment: 0.5 }
                    }
                });
            });
        }
    };

    sharePost = async (postId: string, userId: string) => {
        return prismaClient.$transaction(async (tx) => {
            // Record share
            await tx.communityPostShare.create({
                data: {
                    postId,
                    usersId: userId,
                    sharedAt: new Date()
                }
            });

            // Update counters
            await tx.communityPost.update({
                where: { id: postId },
                data: {
                    sharesCount: { increment: 1 },
                    engagement: { increment: 3 }
                }
            });
        });
    };

    // Comment Interactions
    // likePost = async (postId: string, userId: string) => {
    //     return prismaClient.$transaction(async (tx) => {
    //         const existingLike = await tx.communityPostLike.findUnique({
    //             where: { postId_usersId: { postId, usersId: userId } }
    //         });

    //         if (!existingLike) {
    //             await tx.communityPostLike.create({
    //                 data: { postId, usersId: userId }
    //             });

    //             await tx.communityPost.update({
    //                 where: { id: postId },
    //                 data: { likesCount: { increment: 1 } }
    //             });

    //             // Send notification to post author
    //             const post = await tx.communityPost.findUnique({
    //                 where: { id: postId },
    //                 select: { authorId: true }
    //             });

    //             //   if (post && post.authorId !== userId) {
    //             //     await sendNotification(
    //             //       post.authorId,
    //             //       'POST_LIKE',
    //             //       `${userId} liked your post`,
    //             //       { postId }
    //             //     );
    //             //   }
    //         }
    //     });
    // };

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
}



export default new CommunityService()
