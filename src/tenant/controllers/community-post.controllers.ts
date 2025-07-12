import { Request, Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import communityPostServices from "../services/community-post.services"
import { communityPostSchema } from "../schema/community"

class CommunityPostController {
    constructor() { }

    async createPost(req: CustomRequest, res: Response) {
        const { error, value } = communityPostSchema.validate(req.body)
        if (error) return res.status(400).json({ error: error.details[0].message })

        try {
            const userId = String(req.user.id)
            const communityId = req.params.communityId
            const attachmentUrl = req.body.cloudinaryUrls && req.body.cloudinaryUrls.length > 0 ? req.body.cloudinaryUrls[0] : null

            const post = await communityPostServices.createCommunityPost({
                ...value,
                communityId,
                userId,
                imageUrl: attachmentUrl
            })
            return res.status(201).json(post)

        } catch (error) {
            errorService.handleError(error, res)

        }
    }

    async getCommunityPost(req: CustomRequest, res: Response) {
        try {
            const { communityId } = req.params
            const post = await communityPostServices.getCommunityPosts(communityId)
            if (!post) return res.status(404).json({ message: "Post not found" })
            return res.status(200).json(post)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getSingleCommunityPost(req: CustomRequest, res: Response) {
        try {
            const { communityId, communityPostId } = req.params
            const community = await communityPostServices.getSingleCommunityPost(communityId, communityPostId)
            return res.status(200).json(community)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateCommunityPost(req: CustomRequest, res: Response) {
        const communityPostData = req.body

        try {
            const { communityPostId } = req.params
            const communityPost = await communityPostServices.getCommunityPostById(communityPostId)
            if (!communityPost) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)

            if (communityPost.authorId !== userId) return res.status(403).json({ message: "Unauthorized to edit this post" })

            const updatedPost = await communityPostServices.updateCommunityPost(communityPostId, communityPostData)
            return res.status(200).json(updatedPost)

        } catch (error) {
            errorService.handleError(error, res)
        }

    }

    async deleteCommunityPost(req: CustomRequest, res: Response) {
        try {
            const { communityPostId } = req.params
            const communityPost = await communityPostServices.getCommunityPostById(communityPostId)
            if (!communityPost) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)
            if (communityPost.authorId !== userId) return res.status(403).json({ message: "Unauthorized to delete this post" })

            await communityPostServices.deleteCommunityPost(communityPostId)
            return res.status(204).json({ message: "Post deleted successfully" })

        } catch (error) {
            errorService.handleError(error, res)

        }
    }

    async likePost(req: CustomRequest, res: Response) {
        try {
            const { communityPostId } = req.params;
            const userId = String(req.user.id);
            const result = await communityPostServices.likeCommunityPost(communityPostId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async viewPost(req: CustomRequest, res: Response) {
        try {
            const { communityPostId } = req.params;
            const userId = String(req.user.id);
            const result = await communityPostServices.viewCommunityPost(communityPostId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }


    async getPostLikes(req: CustomRequest, res: Response) {
        try {
            const { communityPostId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const likes = await communityPostServices.getPostLikes(communityPostId, page, pageSize)
            return res.status(200).json(likes)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getPostViews(req: CustomRequest, res: Response) {
        try {
            const { communityPostId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const views = await communityPostServices.getPostViews(communityPostId, page, pageSize)
            return res.status(200).json(views)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new CommunityPostController()