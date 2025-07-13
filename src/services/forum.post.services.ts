import { prismaClient } from "..";
import { CommunityVisibility, CommunityInvitation, MembershipStatus, Community } from "@prisma/client";
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

    // async createCommunityPost(userId: string, data: ICommunityPostCreateDTO) {
    //     const { poll, communityId, categoryId, ...postData } = data;

    //     // Verify user is community member

    //     const community = await prismaClient.community.findUnique({
    //         where: { id: communityId },
    //     });

    //     if (!community) throw new Error('Community not found');

    //     if (community.ownerId !== userId) {
    //         const membership = await prismaClient.communityMember.findUnique({
    //             where: {
    //                 communityId_usersId: {
    //                     communityId: data.communityId,
    //                     usersId: userId
    //                 },
    //                 status: 'MEMBER'
    //             }
    //         });

    //         if (!membership) throw new Error('User is not a community member');
    //     }

    //     const post = await prismaClient.communityPost.create({
    //         data: {
    //             ...postData,
    //             community: {
    //                 connect: {
    //                     id: communityId,
    //                 }
    //             },
    //             author: {
    //                 connect: {
    //                     id: userId,
    //                 },
    //             },
    //             ...(categoryId && {
    //                 category: {
    //                     connect: {
    //                         id: categoryId,
    //                     },
    //                 }
    //             }),
    //             poll: poll
    //                 ? {
    //                     create: {
    //                         question: poll.question,
    //                         expiresAt: poll.expiresAt,
    //                         options: {
    //                             create: poll.options.map(opt => ({
    //                                 option: opt
    //                             }))
    //                         }

    //                     },
    //                 }
    //                 : undefined,
    //         },
    //         include: {
    //             poll: {
    //                 include: { options: true },
    //             },
    //         },
    //     });

    //     return post;
    // }

    // async getSingleCommunityPost(communityId: string, communityPostId: string) {
    //     return prismaClient.communityPost.findMany({
    //         where: {
    //             communityId: communityId,
    //             id: communityPostId,
    //         },
    //         include: {
    //             author: this.userSelect,
    //             likes: true,
    //             views: true,
    //             comments: true,
    //         },
    //         orderBy: {
    //             createdAt: 'desc',
    //         },
    //     })
    // }

    // async getForumPostById(id: string) {
    //     return prismaClient.discussionThread.findUnique({
    //         where: { id },
    //         include: {
        
    //             comments: {
    //                 include: {
    //                     author: this.userSelect,
    //                 },
    //             },
    //             poll: {
    //                 include: {
    //                     options: {
    //                         include: {
    //                             votesBy: {
    //                                 select: {
    //                                     userId: true,
    //                                     optionId: true,
    //                                     user: this.userSelect,
    //                                 }
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //             author: this.userSelect
    //         },
    //     });
    // }

    // async getAllPosts(communityId: string, page = 1, limit = 10, search = '') {
    //     const skip = (page - 1) * limit;

    //     const [posts, total] = await Promise.all([
    //         prismaClient.communityPost.findMany({
    //             where: {
    //                 communityId: communityId,
    //                 isDeleted: false,
    //                 OR: search
    //                     ? [
    //                         { title: { contains: search, mode: 'insensitive' } },
    //                         { content: { contains: search, mode: 'insensitive' } },
    //                     ]
    //                     : undefined,
    //             },
    //             include: {
    //                 poll: {
    //                     include: {
    //                         options: {
    //                             include: {
    //                                 votesBy: {
    //                                     select: {
    //                                         userId: true,
    //                                         optionId: true,
    //                                         user: this.userSelect,
    //                                     }
    //                                 }

    //                             },
    //                         },
    //                     },
    //                 },
    //                 author: this.userSelect
    //             },
    //             orderBy: { createdAt: 'desc' },
    //             skip,
    //             take: limit,
    //         }),
    //         prismaClient.communityPost.count({
    //             where: {
    //                 isDeleted: false,
    //                 OR: search
    //                     ? [
    //                         { title: { contains: search, mode: 'insensitive' } },
    //                         { content: { contains: search, mode: 'insensitive' } },
    //                     ]
    //                     : undefined,
    //             },
    //         }),
    //     ]);

    //     return {
    //         data: posts,
    //         pagination: {
    //             totalItems: total,
    //             currentPage: page,
    //             totalPages: Math.ceil(total / limit),
    //         },
    //     };
    // }

    // async getCommunityPostCreator(communityPostId: string, userId: string) {
    //     return prismaClient.communityPost.findUnique({
    //         where: {
    //             id: communityPostId,
    //             authorId: userId,
    //         },
    //         include: {
    //             author: this.userSelect,
    //         },
    //     })
    // }

    // async allThePostCreatedByMe(userId: string, page = 1, limit = 10, search = '') {

    //     console.log(`Fetching posts created by user ${userId} with page ${page}, limit ${limit}, search "${search}"`);
    //     const skip = (page - 1) * limit;

    //     // Build where clause with proper type assertions
    //     const whereClause: Prisma.CommunityPostWhereInput = {
    //         authorId: userId,
    //         isDeleted: false,
    //     };

    //     if (search) {
    //         whereClause.OR = [
    //             { title: { contains: search, mode: 'insensitive' } },
    //             { content: { contains: search, mode: 'insensitive' } }
    //         ];
    //     }

    //     const [posts, total] = await Promise.all([
    //         prismaClient.communityPost.findMany({
    //             where: whereClause,
    //             include: {
    //                 likes: true,
    //                 views: true,
    //                 comments: {
    //                     include: {
    //                         author: this.userSelect,
    //                     },
    //                 },
    //                 poll: {
    //                     include: {
    //                         options: {
    //                             include: {
    //                                 votesBy: {
    //                                     select: {
    //                                         userId: true,
    //                                         optionId: true,
    //                                         user: this.userSelect,
    //                                     }
    //                                 },
    //                             },
    //                         },
    //                     },
    //                 },
    //                 author: this.userSelect
    //             },
    //             orderBy: {
    //                 createdAt: 'desc'
    //             },

    //             skip,
    //             take: limit
    //         }),

    //         prismaClient.communityPost.count({ where: whereClause })
    //     ]);

    //     return {
    //         data: posts,
    //         pagination: {
    //             totalItems: total,
    //             currentPage: page,
    //             totalPages: Math.ceil(total / limit),
    //         }
    //     };
    // }


    // async deleteCommunityPost(communityPostId: string) {
    //     return await prismaClient.communityPost.update({
    //         where: {
    //             id: communityPostId,
    //         },
    //         data: {
    //             isDeleted: true,
    //         },
    //     })
    // }

    // async updateCommunityPost(postId: string, data: ICommunityPostCreateDTO) {
    //     const {
    //         title,
    //         content,
    //         tags,
    //         imageUrl,
    //         videoUrl,
    //         pinned,
    //         locked,
    //         poll
    //     } = data;

    //     // Update base post data
    //     const updatedPost = await prismaClient.communityPost.update({
    //         where: { id: postId },
    //         data: {
    //             title,
    //             content,
    //             tags,
    //             imageUrl,
    //             videoUrl,
    //             pinned,
    //             locked,
    //             updatedAt: new Date(),
    //         }
    //     });

    //     // If poll exists, handle poll update
    //     if (poll) {
    //         // Upsert the poll for the post
    //         await prismaClient.communityPostPoll.upsert({
    //             where: { postId },
    //             create: {
    //                 postId,
    //                 question: poll.question,
    //                 expiresAt: poll.expiresAt,
    //                 options: {
    //                     create: poll.options.map(opt => ({
    //                         option: opt
    //                     }))
    //                 }
    //             },
    //             update: {
    //                 question: poll.question,
    //                 expiresAt: poll.expiresAt,
    //                 updatedAt: new Date(),
    //                 options: {
    //                     deleteMany: {}, // delete old options
    //                     create: poll.options.map(opt => ({
    //                         option: opt
    //                     }))
    //                 }
    //             }
    //         });
    //     }

    //     return updatedPost;
    // }
    // likeForumPost = async (postId: string, userId: string) => {
    //     return prismaClient.$transaction(async (prisma) => {
    //         const forumPost = await this.getForumPostById(postId);

    //         if (!forumPost) {
    //             throw new Error(`Forum post with ID ${postId} does not exist.`);
    //         }


    //         const existingLike = await prisma.forumPostLike.findUnique({
    //             where: { postId_usersId: { postId, usersId: userId } }
    //         });

    //         if (existingLike) {
    //             await prisma.communityPostLike.delete({
    //                 where: { id: existingLike.id },
    //             });
    //             await prisma.communityPost.update({
    //                 where: { id: postId },
    //                 data: { likesCount: { decrement: 1 } }

    //             });
    //             return { liked: false };
    //         } else {
    //             await prisma.communityPostLike.create({
    //                 data: {
    //                     postId: postId,
    //                     usersId: userId,
    //                 },
    //             });
    //             await prisma.communityPost.update({
    //                 where: { id: postId },
    //                 data: { likesCount: { increment: 1 } }
    //             });
    //             return { liked: true };
    //         }
    //     });
    // }
    // sharePost = async (postId: string, userId: string) => {
    //     return prismaClient.$transaction(async (prisma) => {
    //         // Record share
    //         await prisma.communityPostShare.create({
    //             data: {
    //                 postId,
    //                 usersId: userId,
    //                 sharedAt: new Date()
    //             }
    //         });

    //         // Update counters
    //         await prisma.communityPost.update({
    //             where: { id: postId },
    //             data: {
    //                 sharesCount: { increment: 1 },
    //                 engagement: { increment: 3 }
    //             }
    //         });
    //     });
    // };

    // async viewCommunityPost(postId: string,
    //     usersId?: string,
    //     ipAddress?: string,
    //     userAgent?: string) {
    //     return prismaClient.$transaction(async (prisma) => {
    //         const existingView = await prisma.communityPostView.findFirst({
    //             where: {
    //                 OR: [
    //                     { postId, usersId: usersId || undefined },
    //                     { postId, ipAddress }
    //                 ]
    //             }
    //         });

    //         if (!existingView) {
    //             await prisma.communityPostView.create({
    //                 data: {
    //                     postId,
    //                     usersId: usersId,
    //                     ipAddress,
    //                     usersAgent: userAgent,
    //                 },
    //             });
    //             await prisma.communityPost.update({
    //                 where: { id: postId },
    //                 data: {
    //                     viewsCount: { increment: 1 },
    //                     engagement: { increment: 0.5 }
    //                 }
    //             });
    //             return prisma.communityPost.findUnique({
    //                 where: {
    //                     id: postId,
    //                 },
    //                 include: {
    //                     author: this.userSelect,
    //                     likes: true,
    //                     views: true,
    //                     comments: true,
    //                 },
    //             })
    //         }
    //     })
    // }

    // async getPostLikes(communityPostId: string, page = 1, pageSize = 10) {
    //     const skip = (pageSize - 1) * pageSize;
    //     const [likes, totalCount] = await prismaClient.$transaction([
    //         prismaClient.communityPostLike.findMany({
    //             where: { postId: communityPostId },
    //             include: {
    //                 users: this.userSelect,
    //             },
    //         }),
    //         prismaClient.communityPostLike.count({ where: { postId: communityPostId } })
    //     ])

    //     return {
    //         likes,
    //         totalCount,
    //         currentPage: page,
    //         totalPages: Math.ceil(totalCount / pageSize),
    //     }
    // }
    // async getPostShares(communityPostId: string, page = 1, pageSize = 10) {
    //     const skip = (pageSize - 1) * pageSize;
    //     const [shares, totalCount] = await prismaClient.$transaction([
    //         prismaClient.communityPostShare.findMany({
    //             where: { postId: communityPostId },
    //             include: {
    //                 users: this.userSelect,
    //             },
    //         }),
    //         prismaClient.communityPostShare.count({ where: { postId: communityPostId } })
    //     ])

    //     return {
    //         shares,
    //         totalCount,
    //         currentPage: page,
    //         totalPages: Math.ceil(totalCount / pageSize),
    //     }
    // }

    // async getDiscussionViews(communityPostId: string, page = 1, pageSize = 10) {
    //     const skip = (pageSize - 1) * pageSize;
    //     const [views, totalCount] = await prismaClient.$transaction([
    //         prismaClient.communityPostView.findMany({
    //             where: { postId: communityPostId },
    //             include: {
    //                 users: this.userSelect,
    //             },
    //         }),
    //         prismaClient.communityPostView.count({ where: { postId: communityPostId } })
    //     ])
    //     return {
    //         views,
    //         totalCount,
    //         currentPage: page,
    //         totalPages: Math.ceil(totalCount / pageSize),
    //     }
    // }

    // async voteOnPoll(userId: string, optionId: string) {

    //     const poll = await prismaClient.communityPostPoll.findFirst({
    //         where: {
    //             options: { some: { id: optionId } },
    //             expiresAt: { lt: new Date() } // Check if poll has expired
    //         }
    //     });
    //     if (poll?.expiresAt && poll.expiresAt < new Date()) {
    //         throw new Error('This poll has expired');
    //     }

    //     const pollOption = await prismaClient.communityPostPollOption.findUnique({
    //         where: { id: optionId }
    //     });
    //     if (!pollOption) {
    //         throw new Error('Poll option not found.');
    //     }

    //     const existingVote = await prismaClient.communityPostPollVote.findFirst({
    //         where: {
    //             userId,
    //             optionId,
    //         },
    //     });

    //     if (existingVote) {
    //         throw new Error('You have already voted for this option.');
    //     }

    //     return await prismaClient.$transaction(async (prisma) => {
    //         const vote = await prisma.communityPostPollVote.create({
    //             data: { userId, optionId }
    //         });

    //         await prisma.communityPostPollOption.update({
    //             where: { id: optionId },
    //             data: { votes: { increment: 1 } }
    //         });

    //         return vote;
    //     });
    // }

}

export default new ForumThreadService();