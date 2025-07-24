import { prismaClient } from "..";
import { Prisma } from "@prisma/client";

export class CommentService {
  static async create(data: {
    postId: string;
    content: string;
    authorId: string;
    parentCommentId?: string;
  }) {
    try {
      // Check if the post exists
      const postExists = await prismaClient.communityPost.findUnique({
        where: { id: data.postId },
      });
      console.log(postExists);

      if (!postExists) {
        throw new Error("Post does not exist");
      }

      // If parentCommentId is provided, verify that it exists
      let depth = 0;
      if (data.parentCommentId) {
        const parentComment = await prismaClient.comment.findUnique({
          where: { id: data.parentCommentId },
        });

        if (!parentComment) {
          throw new Error("Parent comment does not exist");
        }

        depth = parentComment.depth + 1;
      }

      // Create the comment
      const comment = await prismaClient.comment.create({
        data: {
          postId: data.postId,
          authorId: data.authorId,
          content: data.content,
          parentCommentId: data.parentCommentId,
          depth,
        },
      });

      // Update comment count in the post
      await prismaClient.communityPost.update({
        where: { id: data.postId },
        data: { commentsCount: { increment: 1 } },
      });

      return comment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Invalid foreign key: Either the post or parent comment does not exist.");
        }
      }
      throw error;
    }
  }

  static async getByPost(postId: string) {
    return prismaClient.comment.findMany({
      where: { postId, isDeleted: false },
      include: {
        author: { select: { id: true, email: true, profile: true } },
        replies: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getById(commentId: string) {
    return prismaClient.comment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        replies: true,
      },
    });
  }

  static async delete(commentId: string) {
    return prismaClient.comment.update({ where: { id: commentId }, data:{isDeleted: true} });
  }

  static async toggleCommentLike({ commentId, isLike }: any, userId: string) {
    const existing = await prismaClient.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } }
    });

    let status: 'liked' | 'disliked' | 'removed';

    if (existing) {
      if (existing.isLike === isLike) {
        await prismaClient.commentLike.delete({ where: { id: existing.id } });
        status = 'removed';
      } else {
        await prismaClient.commentLike.update({
          where: { id: existing.id },
          data: { isLike }
        });
        status = isLike ? 'liked' : 'disliked';
      }
    } else {
      await prismaClient.commentLike.create({
        data: { commentId, userId, isLike }
      });
      status = isLike ? 'liked' : 'disliked';
    }

    return {
      message: 'Comment like toggled successfully.',
      status
    };
  }
}
