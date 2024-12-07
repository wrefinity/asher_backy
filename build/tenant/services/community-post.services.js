"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
class CommunityPostService {
    constructor() {
        this.profileSelect = {
            select: {
                id: true,
                fullname: true,
                profileUrl: true,
            }
        };
        this.userSelect = {
            select: {
                id: true,
                role: true,
                profile: this.profileSelect,
            }
        };
    }
    getSingleCommunityPost(communityId, communityPostId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.findMany({
                where: {
                    communityId: communityId,
                    id: communityPostId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        });
    }
    getCommunityPostById(communityPostId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.findUnique({
                where: {
                    id: communityPostId,
                },
                include: {
                    user: this.userSelect,
                },
            });
        });
    }
    getCommunityPosts(communityId_1) {
        return __awaiter(this, arguments, void 0, function* (communityId, skip = 0, take = 10) {
            return __1.prismaClient.communityPost.findMany({
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
            });
        });
    }
    createCommunityPost(postData) {
        return __awaiter(this, void 0, void 0, function* () {
            delete (postData.cloudinaryUrls);
            return __1.prismaClient.communityPost.create({
                data: postData,
                include: {
                    user: this.userSelect,
                },
            });
        });
    }
    getCommunityPostCreator(communityPostId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.findUnique({
                where: {
                    id: communityPostId,
                    userId: userId,
                },
                include: {
                    user: this.userSelect,
                },
            });
        });
    }
    allThePostCreatedByMe(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.findMany({
                where: {
                    userId: userId,
                },
                include: {
                    user: this.userSelect,
                },
            });
        });
    }
    deleteCommunityPost(communityPostId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.delete({
                where: {
                    id: communityPostId,
                },
            });
        });
    }
    updateCommunityPost(communityPostId, postData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityPost.update({
                where: {
                    id: communityPostId,
                },
                data: postData,
            });
        });
    }
    likeCommunityPost(communityPostId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                const communityPost = yield this.getCommunityPostById(communityPostId);
                if (!communityPost) {
                    throw new Error(`Community post with ID ${communityPostId} does not exist.`);
                }
                const exisitingLike = yield prisma.communityPostLikes.findFirst({
                    where: {
                        postId: communityPostId,
                        userId,
                    },
                });
                if (exisitingLike) {
                    yield prisma.communityPostLikes.delete({
                        where: { id: exisitingLike.id },
                    });
                    yield prisma.communityPost.update({
                        where: { id: communityPostId },
                        data: { likesCount: { decrement: 1 } }
                    });
                    return { liked: false };
                }
                else {
                    yield prisma.communityPostLikes.create({
                        data: {
                            postId: communityPostId,
                            userId,
                        },
                    });
                    yield prisma.communityPost.update({
                        where: { id: communityPostId },
                        data: { likesCount: { increment: 1 } }
                    });
                    return { liked: true };
                }
            }));
        });
    }
    viewCommunityPost(communityPostId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                const exisitingView = yield prisma.communityPostViews.findFirst({
                    where: {
                        postId: communityPostId,
                        userId,
                    },
                });
                if (!exisitingView) {
                    yield prisma.communityPostViews.create({
                        data: {
                            postId: communityPostId,
                            userId,
                        },
                    });
                    yield prisma.communityPost.update({
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
                    });
                }
            }));
        });
    }
    getPostLikes(communityPostId_1) {
        return __awaiter(this, arguments, void 0, function* (communityPostId, page = 1, pageSize = 10) {
            const skip = (pageSize - 1) * pageSize;
            const [likes, totalCount] = yield __1.prismaClient.$transaction([
                __1.prismaClient.communityPostLikes.findMany({
                    where: { postId: communityPostId },
                    include: {
                        user: this.userSelect,
                    },
                }),
                __1.prismaClient.communityPostLikes.count({ where: { postId: communityPostId } })
            ]);
            return {
                likes,
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / pageSize),
            };
        });
    }
    getPostViews(communityPostId_1) {
        return __awaiter(this, arguments, void 0, function* (communityPostId, page = 1, pageSize = 10) {
            const skip = (pageSize - 1) * pageSize;
            const [views, totalCount] = yield __1.prismaClient.$transaction([
                __1.prismaClient.communityPostViews.findMany({
                    where: { postId: communityPostId },
                    include: {
                        user: this.userSelect,
                    },
                }),
                __1.prismaClient.communityPostViews.count({ where: { postId: communityPostId } })
            ]);
            return {
                views,
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / pageSize),
            };
        });
    }
}
exports.default = new CommunityPostService();
