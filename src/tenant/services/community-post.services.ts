import { prismaClient } from "../..";

class CommunityPostService {
    constructor() { }

    private profileSelect = {
        select: {
            id: true,
            fullname: true,
            profileUrl: true,
        }
    }

    private userSelect = {
        select: {
            id: true,
            role: true,
            profile: this.profileSelect,
        }
    }

    async getSingleCommunityPost(communityId: string, communityPostId: string) {
        return prismaClient.communityPost.findMany({
            where: {
                communityId: communityId,
                id: communityPostId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    }

    async getCommunityPostById(communityPostId: string) {
        return prismaClient.communityPost.findUnique({
            where: {
                id: communityPostId,
            },
            include: {
                user: this.userSelect,
            },
        })
    }

    async getCommunityPosts(communityId: string, skip: number = 0, take: number = 10) {
        return prismaClient.communityPost.findMany({
            where: {
                communityId: communityId,
            },
            include: {
                user: this.userSelect,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: skip,
            take: take,
        })
    }

    async createCommunityPost(postData: any) {
        delete (postData.cloudinaryUrls)
        return prismaClient.communityPost.create({
            data: postData,
            include: {
                user: this.userSelect,
            },
        })
    }

    async getCommunityPostCreator(communityPostId: string, userId: string) {
        return prismaClient.communityPost.findUnique({
            where: {
                id: communityPostId,
                userId: userId,
            },
            include: {
                user: this.userSelect,
            },
        })
    }

    async allThePostCreatedByMe(userId: string) {
        return prismaClient.communityPost.findMany({
            where: {
                userId: userId,
            },
            include: {
                user: this.userSelect,
            },
        })
    }

    async deleteCommunityPost(communityPostId: string) {
        return prismaClient.communityPost.delete({
            where: {
                id: communityPostId,
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

    async likeCommunityPost(communityPostId: string, userId: string) {
        return prismaClient.$transaction(async (prisma) => {
            const communityPost = await this.getCommunityPostById(communityPostId);

            if (!communityPost) {
                throw new Error(`Community post with ID ${communityPostId} does not exist.`);
            }
            const exisitingLike = await prisma.communityPostLikes.findFirst({
                where: {
                    postId: communityPostId,
                    userId,
                },
            });

            if (exisitingLike) {
                await prisma.communityPostLikes.delete({
                    where: { id: exisitingLike.id },
                });
                await prisma.communityPost.update({
                    where: { id: communityPostId },
                    data: { likesCount: { decrement: 1 } }

                });
                return { liked: false };
            } else {
                await prisma.communityPostLikes.create({
                    data: {
                        postId: communityPostId,
                        userId,
                    },
                });
                await prisma.communityPost.update({
                    where: { id: communityPostId },
                    data: { likesCount: { increment: 1 } }
                });
                return { liked: true };
            }
        });

    }

    async viewCommunityPost(communityPostId: string, userId: string) {
        return prismaClient.$transaction(async (prisma) => {
            const exisitingView = await prisma.communityPostViews.findFirst({
                where: {
                    postId: communityPostId,
                    userId,
                },
            });

            if (!exisitingView) {
                await prisma.communityPostViews.create({
                    data: {
                        postId: communityPostId,
                        userId,
                    },
                });
                await prisma.communityPost.update({
                    where: { id: communityPostId },
                    data: { viewsCount: { increment: 1 } }
                });
                return prisma.communityPost.findUnique({
                    where: {
                        id: communityPostId,
                    },
                    include: {
                        user: this.userSelect,
                        likes: true,
                        views: true,
                        Comments: true,
                    },
                })
            }
        })
    }

    async getPostLikes(communityPostId: string, page = 1, pageSize = 10) {
        const skip = (pageSize - 1) * pageSize;
        const [likes, totalCount] = await prismaClient.$transaction([
            prismaClient.communityPostLikes.findMany({
                where: { postId: communityPostId },
                include: {
                    user: this.userSelect,
                },
            }),
            prismaClient.communityPostLikes.count({ where: { postId: communityPostId } })
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
            prismaClient.communityPostViews.findMany({
                where: { postId: communityPostId },
                include: {
                    user: this.userSelect,
                },
            }),
            prismaClient.communityPostViews.count({ where: { postId: communityPostId } })
        ])
        return {
            views,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / pageSize),
        }
    }

}

export default new CommunityPostService();