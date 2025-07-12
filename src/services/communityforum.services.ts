import { prismaClient } from "..";
import { Forum, ForumCategory, DiscussionComment } from '@prisma/client';

class ForumService {

    async createForum(data: {
        communityId: string;
        name: string;
        description?: string;
    }): Promise<Forum> {
        return prismaClient.forum.create({
            data: {
                ...data,
                slug: this.generateSlug(data.name),
            },
        });
    }

    async createCategory(data: {
        forumId: string;
        name: string;
        description?: string;
    }): Promise<ForumCategory> {
        return prismaClient.forumCategory.create({
            data: {
                ...data,
                slug: this.generateSlug(data.name),
            },
        });
    }
    // Update forum
    async updateForum(id: string, data: {
        name?: string;
        description?: string;
        order?: number;
    }): Promise<Forum> {
        const updateData: any = { ...data };

        if (data.name) {
            updateData.slug = this.generateSlug(data.name);
        }

        return prismaClient.forum.update({
            where: { id },
            data: updateData,
        });
    }

    // Delete forum
    async deleteForum(id: string): Promise<Forum> {
        return prismaClient.forum.update({
            where: { id },
            data: { isDeleted: true }, // Soft delete
        });
    }

    // Get forum by ID
    async getForumById(id: string): Promise<Forum | null> {
        return prismaClient.forum.findUnique({
            where: { id },
            include: {
                categories: true,
                threads: {
                    include: {
                        author: true,
                        comments: {
                            orderBy: { createdAt: 'desc' },
                            take: 5,
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
    }

    /// --------> comment <-------- ///
    // Create comment
    async createComment(data: {
        threadId: string;
        authorId: string;
        content: string;
        parentCommentId?: string;
    }): Promise<DiscussionComment> {
        return prismaClient.discussionComment.create({
            data: {
                ...data,
                depth: data.parentCommentId
                    ? await this.calculateDepth(data.parentCommentId)
                    : 0,
            },
        });
    }

    // Update comment
    async updateComment(id: string, content: string): Promise<DiscussionComment> {
        return prismaClient.discussionComment.update({
            where: { id },
            data: { content },
        });
    }

    // Delete comment
    async deleteComment(id: string): Promise<DiscussionComment> {
        return prismaClient.discussionComment.delete({
            where: { id },
        });
    }

    // Like/unlike comment
    async toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
        const existingLike = await prismaClient.discussionCommentLike.findUnique({
            where: { commentId_usersId: { commentId, usersId: userId } },
        });

        if (existingLike) {
            await prismaClient.discussionCommentLike.delete({
                where: { id: existingLike.id },
            });
            await prismaClient.discussionComment.update({
                where: { id: commentId },
                data: { likesCount: { decrement: 1 } },
            });
            return false; // Unlike
        } else {
            await prismaClient.discussionCommentLike.create({
                data: { commentId, usersId: userId },
            });
            await prismaClient.discussionComment.update({
                where: { id: commentId },
                data: { likesCount: { increment: 1 } },
            });
            return true; // Like
        }
    }

    private async calculateDepth(parentCommentId: string): Promise<number> {
        const parent = await prismaClient.discussionComment.findUnique({
            where: { id: parentCommentId },
            select: { depth: true }
        });
        return parent ? parent.depth + 1 : 1;
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
    }


}

export default ForumService;