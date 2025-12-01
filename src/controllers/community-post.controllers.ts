import { Request, Response } from "express"
import errorService from "../services/error.service"
import { CustomRequest } from "../utils/types"
import communityPostServices from "../services/community.post.services"
import { createCommunityPostSchema } from "../validations/schemas/community"
import communityServices from "../services/community.services"

class CommunityPostController {
    constructor() { }


       async createPost(req: CustomRequest, res: Response) {
        let userId: string | undefined;
        let community: any;

        try {
            const communityId = req.params.communityId || String(req.user.id);
            community = await communityServices.getCommunityById(communityId);
            
            if (!community) {
                return res.status(404).json({ message: "No community found for this landlord." });
            }

            const { error, value } = createCommunityPostSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Use the actual user ID for ownership check (community.ownerId is user ID, not landlord ID)
            // But we'll pass both to the service so it can check both ownership and membership
            const userActualId = String(req.user?.id);
            const landlordId = req.user?.landlords?.id ? String(req.user.landlords.id) : null;
            
            if (!userActualId) {
                return res.status(404).json({ message: 'User not found' });
            }

            const { cloudinaryAudioUrls, cloudinaryImageUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, ...data } = value;

            const imageUrl = cloudinaryAudioUrls || [];
            const videoUrl = cloudinaryVideoUrls || [];

            // Pass the user ID (for ownership check) - the service will also check membership if needed
            const post = await communityPostServices.createCommunityPost(userActualId, {
                ...data,
                communityId: community.id,
                imageUrl,
                videoUrl,
            });
            
            console.log('✅ Post created and returned to frontend:', post.id);
            return res.status(201).json({ 
                data: post,
                message: 'Post created successfully'
            });

        } catch (error: any) {
            console.error('❌ Error creating community post:', error);
            console.error('Error details:', {
                message: error?.message,
                stack: error?.stack,
                userId: userId || 'not set',
                communityId: community?.id || 'not found',
                errorName: error?.name,
                errorCode: error?.code,
            });
            
            // Provide more specific error messages
            if (error?.message?.includes('not a community member')) {
                return res.status(403).json({ 
                    success: false,
                    message: 'You are not a member of this community',
                    code: 'NOT_MEMBER'
                });
            }
            
            if (error?.message?.includes('Community not found')) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Community not found',
                    code: 'COMMUNITY_NOT_FOUND'
                });
            }

            // Use error service for other errors
            errorService.handleError(error, res);
        }
    }

    getRecentPosts = async (req: CustomRequest, res: Response) => {
        try {
            const { communityId } = req.params;
            const posts = await communityPostServices.getRecentPosts(communityId);
            res.status(200).json(posts);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
    
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

            // Standardized user ID extraction pattern
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }

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

            // Standardized user ID extraction pattern
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }
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
            // Standardized user ID extraction pattern
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }
            const { optionId } = req.body;
            const result = await communityPostServices.voteOnPoll(userId, optionId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    async likePost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            // Standardized user ID extraction pattern
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }
            const result = await communityPostServices.likeCommunityPost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async sharePost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            // Standardized user ID extraction pattern
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }
            const result = await communityPostServices.sharePost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async viewPost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            // Standardized user ID extraction pattern - views can be anonymous, so userId is optional
            const userId = req.user ? String(req.user?.landlords?.id || req.user?.id) : undefined;
            const ipAddress = req.ip || req.socket.remoteAddress;
            const userAgent = req.get('user-agent');
            const result = await communityPostServices.viewCommunityPost(postId, userId, ipAddress, userAgent);
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

    async togglePinPost(req: CustomRequest, res: Response) {
        try {
            const { postId } = req.params;
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }

            const result = await communityPostServices.togglePinPost(postId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getPinnedPosts(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user?.landlords?.id || req.user?.id);
            if (!userId) {
                return res.status(404).json({ message: 'User not found' });
            }

            const pinnedPosts = await communityPostServices.getPinnedPosts(userId);
            return res.status(200).json(pinnedPosts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    

}

export default new CommunityPostController()