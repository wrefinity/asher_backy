import { Request, Response } from "express"
import errorService from "../services/error.service"
import { CustomRequest } from "../utils/types"
import communityPostServices from "../services/community.post.services"
import { createCommunityPostSchema } from "../validations/schemas/community"
import communityServices from "../services/community.services"

class CommunityPostController {
    constructor() { }

    async createPost(req: CustomRequest, res: Response) {

        const landlordId = req.params.landlordId || String(req.user.id);
        const community = await communityServices.getLandlordCommunity(landlordId)
        if (!community) {
            return res.status(404).json({ message: "No community found for this landlord." });
        }
        const { error, value } = createCommunityPostSchema.validate(req.body)
        if (error) return res.status(400).json({ error: error.details[0].message })

        try {
            const userId = String(req.user.id)
            const { cloudinaryAudioUrls, cloudinaryImageUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, ...data } = value

            const imageUrl = cloudinaryAudioUrls || [];
            const videoUrl = cloudinaryVideoUrls || [];

            const post = await communityPostServices.createCommunityPost(userId, {
                ...data,
                communityId: community.id,
                imageUrl,
                videoUrl,
            })
            return res.status(201).json(post)

        } catch (error) {
            errorService.handleError(error, res)

        }
    }

    async getCommunityPost(req: CustomRequest, res: Response) {
        console.log(req.params)
        try {
            const { communityId } = req.params
            const { page = 1, limit = 10, search } = req.query;
            const posts = await communityPostServices.getAllPosts(communityId, Number(page), Number(limit), String(search || ''));
            res.json(posts);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getSingleCommunityPost(req: CustomRequest, res: Response) {
        try {
            const { communityId, postId } = req.params
            const community = await communityPostServices.getSingleCommunityPost(communityId, postId)
            return res.status(200).json(community)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async getCurrentUserPost(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user.id);
            const { page = 1, limit = 10, search = '' } = req.query;

            const posts = await communityPostServices.allThePostCreatedByMe(
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


    async updateCommunityPost(req: CustomRequest, res: Response) {
        const communityPostData = req.body

        try {
            const { postId } = req.params
            const communityPost = await communityPostServices.getCommunityPostById(postId)
            if (!communityPost) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)

            if (communityPost.authorId !== userId) return res.status(403).json({ message: "Unauthorized to edit this post" })

            const updatedPost = await communityPostServices.updateCommunityPost(postId, communityPostData)
            return res.status(200).json(updatedPost)

        } catch (error) {
            errorService.handleError(error, res)
        }

    }

    async deleteCommunityPost(req: CustomRequest, res: Response) {
        try {

            const { postId } = req.params
            const communityPost = await communityPostServices.getCommunityPostById(postId)
            if (!communityPost) return res.status(404).json({ message: "Post not found" })

            const userId = String(req.user.id)
            if (communityPost.authorId !== userId) return res.status(403).json({ message: "Unauthorized to delete this post" })

            const deleted = await communityPostServices.deleteCommunityPost(postId)
            console.log(deleted)
            if (!deleted) return res.status(404).json({ message: "Post not found" })
            return res.status(200).json({ deleted, message: "Post deleted successfully" })

        } catch (error) {
            errorService.handleError(error, res)

        }
    }
    voteOnPoll = async (req: CustomRequest, res: Response) => {
        try {
            const { optionId } = req.body;
            const result = await communityPostServices.voteOnPoll(req.user.id, optionId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    async likePost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = String(req.user.id);
            const result = await communityPostServices.likeCommunityPost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async sharePost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = String(req.user.id);
            const result = await communityPostServices.sharePost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async viewPost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = String(req.user.id);
            const result = await communityPostServices.viewCommunityPost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }


    async getPostLikes(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const likes = await communityPostServices.getPostLikes(postId, page, pageSize)
            return res.status(200).json(likes)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getPostViews(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const views = await communityPostServices.getPostViews(postId, page, pageSize)
            return res.status(200).json(views)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async getPostShares(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const shares = await communityPostServices.getPostShares(postId, page, pageSize)
            return res.status(200).json(shares)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new CommunityPostController()