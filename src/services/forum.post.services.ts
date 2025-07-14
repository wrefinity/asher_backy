import { prismaClient } from "..";
// import { CommunityVisibility} from "@prisma/client";
import { ICommunityPostCreateDTO } from "../validations/interfaces/community.interface";
import { Prisma } from "@prisma/client";

class ForumThreadService {
    constructor() { }


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

    async createForumThread(userId: string, data: any) {
        const { poll, title, content, tags, forumId, categoryId, ...postData } = data;

        // Verify user is forum member
        const forum = await prismaClient.forum.findUnique({
            where: { id: forumId },
            include: {
                community: true
            }
        });

        if (!forum) throw new Error('Forum not found');

        if (forum.community.ownerId !== userId) {
            const membership = await prismaClient.forumMember.findUnique({
                where: {
                    forumId_usersId: {
                        forumId: forumId,
                        usersId: userId
                    },
                    status: 'MEMBER'
                }
            });

            if (!membership) throw new Error('User is not a community member');
        }

        const thread = await prismaClient.discussionThread.create({
            data: {
                ...postData,
                title,
                content,
                tags,
                forum: {
                    connect: {
                        id: forumId,
                    }
                },
                author: {
                    connect: {
                        id: userId,
                    },
                },
                ...(categoryId && {
                    category: {
                        connect: {
                            id: categoryId,
                        },
                    }
                }),
                poll: poll
                    ? {
                        create: {
                            question: poll.question,
                            expiresAt: poll.expiresAt,
                            options: {
                                create: poll.options.map(opt => ({
                                    option: opt
                                }))
                            }

                        },
                    }
                    : undefined,
            },
            include: {
                poll: {
                    include: { options: true },
                },
            },
        });

        return thread;
    }

    async getSingleForumThread(forumId: string, threadId: string) {
        return prismaClient.discussionThread.findFirst({
            where: {
                forumId: forumId,
                id: threadId,
            },
            include: {
                author: this.userSelect,
                comments: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    }

    async getForumThreadById(id: string) {
        return prismaClient.discussionThread.findUnique({
            where: { id },
            include: {

                comments: {
                    include: {
                        author: this.userSelect,
                    },
                },
                poll: {
                    include: {
                        options: {
                            include: {
                                votesBy: {
                                    select: {
                                        userId: true,
                                        optionId: true,
                                        user: this.userSelect,
                                    }
                                },
                            },
                        },
                    },
                },
                author: this.userSelect
            },
        });
    }

    async getForumThread(forumId: string, page = 1, limit = 10, search = '') {
        const skip = (page - 1) * limit;

        const [thread, total] = await Promise.all([
            prismaClient.discussionThread.findMany({
                where: {
                    forumId: forumId,
                    isDeleted: false,
                    OR: search
                        ? [
                            { title: { contains: search, mode: 'insensitive' } },
                            { content: { contains: search, mode: 'insensitive' } },
                        ]
                        : undefined,
                },
                include: {
                    poll: {
                        include: {
                            options: {
                                include: {
                                    votesBy: {
                                        select: {
                                            userId: true,
                                            optionId: true,
                                            user: this.userSelect,
                                        }
                                    }

                                },
                            },
                        },
                    },
                    author: this.userSelect
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prismaClient.discussionThread.count({
                where: {
                    isDeleted: false,
                    OR: search
                        ? [
                            { title: { contains: search, mode: 'insensitive' } },
                            { content: { contains: search, mode: 'insensitive' } },
                        ]
                        : undefined,
                },
            }),
        ]);

        return {
            data: thread,
            pagination: {
                totalItems: total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getForumDiscussionCreator(discussionId: string, userId: string) {
        return prismaClient.discussionThread.findUnique({
            where: {
                id: discussionId,
                authorId: userId,
            },
            include: {
                author: this.userSelect,
            },
        })
    }

    async allDiscussionThreadCreatedByMe(userId: string, page = 1, limit = 10, search = '') {

        const skip = (page - 1) * limit;

        // Build where clause with proper type assertions
        const whereClause: Prisma.DiscussionThreadWhereInput = {
            authorId: userId,
            isDeleted: false,
        };

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [discussion, total] = await Promise.all([
            prismaClient.discussionThread.findMany({
                where: whereClause,
                include: {
                    comments: {
                        include: {
                            author: this.userSelect,
                        },
                    },
                    poll: {
                        include: {
                            options: {
                                include: {
                                    votesBy: {
                                        select: {
                                            userId: true,
                                            optionId: true,
                                            user: this.userSelect,
                                        }
                                    },
                                },
                            },
                        },
                    },
                    author: this.userSelect
                },
                orderBy: {
                    createdAt: 'desc'
                },

                skip,
                take: limit
            }),

            prismaClient.discussionThread.count({ where: whereClause })
        ]);

        return {
            data: discussion,
            pagination: {
                totalItems: total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    async deleteDiscussionThread(discussionId: string) {
        return await prismaClient.discussionThread.update({
            where: {
                id: discussionId,
            },
            data: {
                isDeleted: true,
            },
        })
    }

    async updateDiscussionThread(threadId: string, data: ICommunityPostCreateDTO) {
        const {
            title,
            content,
            tags,
            imageUrl,
            pinned,
            locked,
            poll
        } = data;

        // Update base post data
        const updateDiscussionThread = await prismaClient.discussionThread.update({
            where: { id: threadId },
            data: {
                title,
                content,
                tags,
                imageUrl,
                pinned,
                locked,
                updatedAt: new Date(),
            }
        });

        // If poll exists, handle poll update
        if (poll) {
            // Upsert the poll for the post
            await prismaClient.discussionThreadPoll.upsert({
                where: { threadId },
                create: {
                    threadId,
                    question: poll.question,
                    expiresAt: poll.expiresAt,
                    options: {
                        create: poll.options.map(opt => ({
                            option: opt
                        }))
                    }
                },
                update: {
                    question: poll.question,
                    expiresAt: poll.expiresAt,
                    updatedAt: new Date(),
                    options: {
                        deleteMany: {}, // delete old options
                        create: poll.options.map(opt => ({
                            option: opt
                        }))
                    }
                }
            });
        }

        return updateDiscussionThread;
    }
    async getThreadCommentById(commentId: string) {
        return prismaClient.discussionComment.findUnique({
            where: { id: commentId },
            include: {
                author: this.userSelect,
                likes: true,
                replies: {
                    include: {
                        author: this.userSelect,
                        likes: true
                    }
                }
            }
        });
    }


likeDiscussionThread = async (threadId: string, usersId: string) => {
    return prismaClient.$transaction(async (prisma) => {
        // Verify thread exists first
        const thread = await prisma.discussionThread.findUnique({
            where: { id: threadId }
        });

        if (!thread) {
            throw new Error(`Thread with ID ${threadId} does not exist.`);
        }

        const existingLike = await prisma.forumThreadLike.findUnique({
            where: { threadId_usersId: { threadId, usersId } }
        });

        if (existingLike) {
            // DELETE LIKE
            await prisma.forumThreadLike.delete({
                where: { id: existingLike.id },
            });
            
            // FIXED: Use threadId instead of existingLike.id
            await prisma.discussionThread.update({
                where: { id: threadId }, // CORRECTED
                data: { likesCount: { decrement: 1 } }
            });
            
            return { liked: false };
        } else {
            // CREATE LIKE
            await prisma.forumThreadLike.create({
                data: { threadId, usersId },
            });
            
            await prisma.discussionThread.update({
                where: { id: threadId },
                data: { likesCount: { increment: 1 } }
            });
            
            return { liked: true };
        }
    }, {
        timeout: 15000,
        maxWait: 15000
    });
}
    likeThreadComment = async (commentId: string, usersId: string) => {
        return prismaClient.$transaction(async (prisma) => {
            const threadComment = await this.getThreadCommentById(commentId);

            if (!threadComment) {
                throw new Error(`Thread comment with ID ${commentId} does not exist.`);
            }


            const existingLike = await prisma.discussionCommentLike.findUnique({
                where: { commentId_usersId: { commentId, usersId } }
            });

            if (existingLike) {
                await prisma.discussionCommentLike.delete({
                    where: { id: existingLike.id },
                });
                await prisma.discussionComment.update({
                    where: { id: existingLike.id },
                    data: { likesCount: { decrement: 1 } }

                });
                return { liked: false };
            } else {
                await prisma.discussionCommentLike.create({
                    data: {
                        commentId: commentId,
                        usersId: usersId,
                    },
                });
                await prisma.discussionComment.update({
                    where: { id: commentId },
                    data: { likesCount: { increment: 1 } }
                });
                return { liked: true };
            }
        });
    }

    shareDiscussionComment = async (commentId: string, userId: string) => {
        return prismaClient.$transaction(async (prisma) => {
            // Record share
            await prisma.discussionCommentShare.create({
                data: {
                    commentId,
                    usersId: userId
                }
            });

            // Update counters
            await prisma.discussionComment.update({
                where: { id: commentId },
                data: {
                    shareCount: { increment: 1 }
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

    async getThreadLikes(threadId: string) {
        const [likes, totalCount] = await prismaClient.$transaction([
            prismaClient.discussionThread.findMany({
                where: { id: threadId },
                include: {
                    author: this.userSelect,
                },
            }),
            prismaClient.forumThreadLike.count({ where: { threadId } })
        ])

        return {
            likes,
            totalCount,       
        }
    }
    async getDiscussionCommentShares(commentId: string) {

        const [shares, totalCount] = await prismaClient.$transaction([
            prismaClient.discussionCommentShare.findMany({
                where: { commentId },
                include: {
                    users: this.userSelect,
                },
            }),
            prismaClient.discussionCommentShare.count({ where: { commentId } })
        ])

        return {
            shares,
            totalCount
        }
    }

    async getDiscussionViews(communityPostId: string, page = 1, pageSize = 10) {
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

    async voteOnPoll(userId: string, optionId: string) {

        const poll = await prismaClient.discussionThreadPoll.findFirst({
            where: {
                options: { some: { id: optionId } },
                expiresAt: { lt: new Date() } // Check if poll has expired
            }
        });
        if (poll?.expiresAt && poll.expiresAt < new Date()) {
            throw new Error('This poll has expired');
        }

        const pollOption = await prismaClient.discussionThreadPollOption.findUnique({
            where: { id: optionId }
        });
        if (!pollOption) {
            throw new Error('Poll option not found.');
        }

        const existingVote = await prismaClient.discussionThreadPollVote.findFirst({
            where: {
                userId,
                optionId,
            },
        });

        if (existingVote) {
            throw new Error('You have already voted for this option.');
        }

        return await prismaClient.$transaction(async (prisma) => {
            const vote = await prisma.discussionThreadPollVote.create({
                data: { userId, optionId }
            });

            await prisma.discussionThreadPollOption.update({
                where: { id: optionId },
                data: { votes: { increment: 1 } }
            });

            return vote;
        });
    }

    async updateDiscussionThreadPost(threadId: string, data: any) {
        const {
            title,
            content,
            tags,
            imageUrl,
            pinned,
            locked,
            poll
        } = data;

        // Update base post data
        const updateThread = await prismaClient.discussionThread.update({
            where: { id: threadId },
            data: {
                title,
                content,
                tags,
                imageUrl,
                pinned,
                locked,
                updatedAt: new Date(),
            }
        });

        // If poll exists, handle poll update
        if (poll) {
            // Upsert the poll for the post
            await prismaClient.discussionThreadPoll.upsert({
                where: { threadId },
                create: {
                    threadId,
                    question: poll.question,
                    expiresAt: poll.expiresAt,
                    options: {
                        create: poll.options.map(opt => ({
                            option: opt
                        }))
                    }
                },
                update: {
                    question: poll.question,
                    expiresAt: poll.expiresAt,
                    updatedAt: new Date(),
                    options: {
                        deleteMany: {},
                        create: poll.options.map(opt => ({
                            option: opt
                        }))
                    }
                }
            });
        }
        return updateThread;
    }


    async getForumThreadCreator(threadId: string, userId: string) {
        return prismaClient.discussionThread.findUnique({
            where: {
                id: threadId,
                authorId: userId,
            },
            include: {
                author: this.userSelect,
            },
        })
    }


    async createDiscussionThreadComment(userId: string, threadId: string, content: string) {
      
        // Create reply
        return prismaClient.discussionComment.create({
            data: {
                threadId,
                authorId: userId,
                content,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        role: true,
                        profile: {
                            select: {
                                id: true,
                                firstName: true,
                                profileUrl: true
                            }
                        }
                    }
                }
            }
        });
    }
    async createCommentReply(userId: string, commentId: string, content: string) {
        // Fetch parent comment
        const parentComment = await prismaClient.discussionComment.findUnique({
            where: { id: commentId }
        });

        if (!parentComment) throw new Error('Parent comment not found');

        // Create reply
        return prismaClient.discussionComment.create({
            data: {
                threadId: parentComment.threadId,
                authorId: userId,
                content,
                parentCommentId: parentComment.id,
                depth: parentComment.depth + 1
            },
            include: {
                author: {
                    select: {
                        id: true,
                        role: true,
                        profile: {
                            select: {
                                id: true,
                                firstName: true,
                                profileUrl: true
                            }
                        }
                    }
                }
            }
        });
    }

    async getDiscussionCommentsWithReplies(threadId: string) {
        return await prismaClient.discussionComment.findMany({
            where: {
                threadId,
                parentCommentId: null, // Only fetch top-level comments
            },
            include: {
                author: {
                    select: {
                        id: true,
                        role: true,
                        profile: {
                            select: {
                                id: true,
                                firstName: true,
                                profileUrl: true
                            }
                        }
                    }
                },
                replies: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                role: true,
                                profile: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        profileUrl: true
                                    }
                                }
                            }
                        },
                    }
                },
            },
            orderBy: {
                createdAt: 'asc',
            }
        });
    }

}

export default new ForumThreadService();