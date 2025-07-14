import { Request, Response } from "express"
import errorService from "../services/error.service"
import { CustomRequest } from "../utils/types"
import ForumThreadServices from "../services/forum.post.services"
import { createCommunityPostSchema } from "../validations/schemas/community"

class ForumThreadController {
    constructor() { }

    async createThread(req: CustomRequest, res: Response) {
        const { error, value } = createCommunityPostSchema.validate(req.body)
        if (error) return res.status(400).json({ error: error.details[0].message })

        try {
            const userId = String(req.user.id)
            const forumId = req.params.forumId
            const { cloudinaryAudioUrls, cloudinaryImageUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, ...data } = value

            const imageUrl = cloudinaryAudioUrls || [];
            // const videoUrl = cloudinaryVideoUrls || [];

            const post = await ForumThreadServices.createForumThread(userId, {
                ...data,
                forumId,
                imageUrl
            })
            return res.status(201).json(post)

        } catch (error) {
            errorService.handleError(error, res)

        }
    }

    async getForumThread(req: CustomRequest, res: Response) {
        try {
            const { forumId } = req.params
            const { page = 1, limit = 10, search } = req.query;
            const posts = await ForumThreadServices.getForumThread(forumId, Number(page), Number(limit), String(search || ''));
            res.json(posts);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getSingleForumThread(req: CustomRequest, res: Response) {
        try {
            const { forumId, threadId } = req.params
            const forum = await ForumThreadServices.getSingleForumThread(forumId, threadId)
            return res.status(200).json(forum)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async getCurrentUserThread(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user.id);
            const { page = 1, limit = 10, search = '' } = req.query;

            const posts = await ForumThreadServices.allDiscussionThreadCreatedByMe(
                userId,
                Number(page),
                Number(limit),
                String(search)
            );

            return res.status(200).json(posts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


    async updateForumThread(req: CustomRequest, res: Response) {
        const forumThreadData = req.body

        try {
            const { threadId } = req.params
            const forumThread = await ForumThreadServices.getForumThreadById(threadId)
            if (!forumThread) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)

            if (forumThread.authorId !== userId) return res.status(403).json({ message: "Unauthorized to edit this post" })

            const updatedThread = await ForumThreadServices.updateDiscussionThreadPost(threadId, forumThreadData)
            return res.status(200).json(updatedThread)

        } catch (error) {
            errorService.handleError(error, res)
        }

    }

    async deleteForumThread(req: CustomRequest, res: Response) {
        try {

            const { threadId } = req.params
            const forumThread = await ForumThreadServices.getForumThreadById(threadId)
            if (!forumThread) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)
            if (forumThread.authorId !== userId) return res.status(403).json({ message: "Unauthorized to delete this post" })

            const deleted = await ForumThreadServices.deleteDiscussionThread(threadId)
            console.log(deleted)
            if (!deleted) return res.status(404).json({ message: "thread not found" })
            return res.status(200).json({ deleted, message: "thread deleted successfully" })

        } catch (error) {
            errorService.handleError(error, res)

        }
    }
    voteOnPoll = async (req: CustomRequest, res: Response) => {
        try {
            const { optionId } = req.body;
            const result = await ForumThreadServices.voteOnPoll(req.user.id, optionId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    async likeDiscussionThread(req: CustomRequest, res: Response) {
        try {
            const { threadId } = req.params;
            const userId = String(req.user.id);
            const result = await ForumThreadServices.likeDiscussionThread(threadId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async shareDiscussionComment(req: CustomRequest, res: Response) {
        try {
            const { commentId } = req.params;
            const userId = String(req.user.id);
            const result = await ForumThreadServices.shareDiscussionComment(commentId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getThreadCommentsWithReplies = async (req: Request, res: Response) => {
        try {
            console.log("================ checking thread comments ================")
            const threadId = req.params.threadId
            const comments = await ForumThreadServices.getDiscussionCommentsWithReplies(threadId)
            return res.status(200).json({ data: comments })
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getLikedDiscussionThread(req: CustomRequest, res: Response) {
        try {
            const { threadId } = req.params;
            const likes = await ForumThreadServices.getThreadLikes(threadId)
            return res.status(200).json(likes)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getDiscussionCommentShares(req: CustomRequest, res: Response) {
        try {
            const { commentId } = req.params;
            const shares = await ForumThreadServices.getDiscussionCommentShares(commentId)
            return res.status(200).json(shares)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async makeThreadComment(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user.id);
            const { threadId } = req.params;
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({ message: 'Content is required' });
            }

            const reply = await ForumThreadServices.createDiscussionThreadComment(userId, threadId, content);
            return res.status(201).json(reply);

        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    async replyToComment(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user.id);
            const { commentId } = req.params;
            const { content } = req.body;

            if (!content) {
                return res.status(400).json({ message: 'Content is required' });
            }

            const reply = await ForumThreadServices.createCommentReply(userId, commentId, content);
            return res.status(201).json(reply);

        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new ForumThreadController()