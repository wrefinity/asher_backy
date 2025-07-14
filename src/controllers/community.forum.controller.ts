import { forumInformationSchema } from "../validations/schemas/community"
import errorService from "../services/error.service";
import { CustomRequest } from "../utils/types"
import { Request, Response } from "express";
import forumServices from "../services/forum.services";
import communityServices from "../services/community.services";


class ForumController {
    constructor() { }

    async createForum(req: CustomRequest, res: Response) {

        const landlordId = req.user.id

        const community = await communityServices.getLandlordCommunity(landlordId)
        if (!community) {
            return res.status(404).json({ message: "No community found for this landlord." });
        }
        
        // Validate the request body against the schema
        const { error, value } = forumInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {

            const { cloudinaryImageUrls, cloudinaryAudioUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, ...data } = value;
            if (cloudinaryImageUrls && cloudinaryImageUrls.length > 0) {
                data.avatarUrl = cloudinaryImageUrls || [];
            }
            const ownerId = String(req.user.id)
            const forum = await forumServices.createForum({ ...data, ownerId, communityId: community.id })
            return res.status(200).json({ forum, message: "Forum created successfully" });

        } catch (error) {
            errorService.handleError(error, res)
        }

    }

    async getFilteredForums(req: Request, res: Response) {
        try {
            const search = String(req.query.search || '');
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;

            const result = await forumServices.getForums({
                search,
                page,
                limit,
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Error fetching forums:', error);
            res.status(500).json({ message: 'Failed to fetch forums' });
        }
    }


    async getForumById(req: CustomRequest, res: Response) {
        try {
            const forumId = req.params.forumId;
            const forum = await forumServices.getForumById(forumId)
            if (!forum) return res.status(404).json({ message: "Forum not found" })
            return res.status(200).json(forum)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateForum(req: CustomRequest, res: Response) {
        const { forumId } = req.params
        const forumOwnerId = String(req.user.id)
        const { error, value } = forumInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const forum = await forumServices.getForumById(forumId)
            if (!forum) return res.status(404).json({ message: "Forum not found" })
            // if (forum.ownerId !== forumOwnerId) {
            //     return res.status(403).json({ message: "You are not authorized to update this forum" })
            // }
            const updatedForum = await forumServices.updateForum(forumId, { ...value })
            return res.status(200).json(updatedForum)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async deleteForum(req: CustomRequest, res: Response) {
        try {
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'Invalid or empty list of ids.' });
            }

            const result = await forumServices.deleteForums(ids);

            return res.status(200).json({
                message: 'Forums deleted successfully',
                count: result.count,
            });
        } catch (error) {
            console.error('Error deleting forums:', error);
            return res.status(500).json({ message: 'Failed to delete forums' });
        }
    }

    // async getForumOwner(req: CustomRequest, res: Response) {
    //     try {
    //         const { forumId } = req.params
    //         const forum = await forumServices.getForumOwner(forumId)
    //         if (!forum) return res.status(404).json({ message: "Forum not found" })
    //         return res.status(200).json(forum.owner)
    //     } catch (error) {
    //         errorService.handleError(error, res)
    //     }
    // }

    addMembersToForum = async (req: CustomRequest, res: Response) => {
        try {
            const { forumId } = req.params
            const { userIds } = req.body

            if (!forumId || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ message: 'Invalid forumId or userIds' })
            }

            const result = await forumServices.addForumMembers(forumId, userIds)

            return res.status(200).json({
                message: 'Members added successfully',
                addedCount: result.count
            })
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getForumMembers(req: CustomRequest, res: Response) {
        const { forumId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        try {
            const result = await forumServices.getForumMembers(forumId, page, limit);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
    async removeForumMembers(req: CustomRequest, res: Response) {
        const { forumId } = req.params;
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: "userIds must be a non-empty array" });
        }

        try {
            const result = await forumServices.removeForumMembers(forumId, userIds);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new ForumController();