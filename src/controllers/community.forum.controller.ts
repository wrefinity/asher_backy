import { forumInformationSchema } from "../validations/schemas/community"
import errorService from "../services/error.service";
import { CustomRequest } from "../utils/types"
import { Request, Response } from "express";
import forumServices from "../services/forum.services";
import communityServices from "../services/community.services";
import communityJoinService from "../services/community.join.service";
import {
    assertForumAccess,
    canAccessForum,
} from "../services/community.access.service";


class ForumController {
    constructor() { }

    async createForum(req: CustomRequest, res: Response) {
        const userId = String(req.user.id);
        const community = await communityServices.getOwnedCommunity(userId);
        if (!community) {
            return res.status(404).json({ message: "Create a community before adding forums." });
        }

        const { error, value } = forumInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const { cloudinaryImageUrls, cloudinaryAudioUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, memberUserIds, ...data } = value;
            if (cloudinaryImageUrls && cloudinaryImageUrls.length > 0) {
                data.imageUrl = cloudinaryImageUrls || [];
            }
            const forum = await forumServices.createForum({
                ...data,
                ownerId: userId,
                communityId: community.id,
                isDiscoverable: Boolean(data.isDiscoverable),
            });

            if (Array.isArray(memberUserIds) && memberUserIds.length > 0) {
                await forumServices.addForumMembers(forum.id, memberUserIds, userId);
            }

            return res.status(200).json({ forum, message: "Forum created successfully" });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getRecentForums = async (req: CustomRequest, res: Response) => {
        try {
            const { communityId } = req.params;
            const userId = String(req.user?.id);
            const canAccess = await communityServices.canUserAccessCommunity(userId, communityId);
            if (!canAccess) {
                return res.status(403).json({ message: "You do not have access to this community" });
            }
            const forums = await forumServices.getForumsVisibleToUser(communityId, userId);
            res.status(200).json(forums);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    async getFilteredForums(req: CustomRequest, res: Response) {
        try {
            const search = String(req.query.search || '');
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const userId = String(req.user?.id);

            const result = await forumServices.getForumsForUser(userId, {
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
            const userId = String(req.user?.id);
            const allowed = await canAccessForum(userId, forumId);
            if (!allowed) {
                return res.status(403).json({ message: "You do not have access to this forum" });
            }
            const forum = await forumServices.getForumById(forumId)
            if (!forum) return res.status(404).json({ message: "Forum not found" })
            return res.status(200).json(forum)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateForum(req: CustomRequest, res: Response) {
        const { forumId } = req.params
        const actorId = String(req.user.id)
        const { error, value } = forumInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const forum = await forumServices.getForumById(forumId)
            if (!forum) return res.status(404).json({ message: "Forum not found" })
            const community = await communityServices.getCommunityById(forum.communityId);
            if (!community || (community.ownerId !== actorId && forum.ownerId !== actorId)) {
                return res.status(403).json({ message: "You are not authorized to update this forum" })
            }
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

    addMembersToForum = async (req: CustomRequest, res: Response) => {
        try {
            const { forumId } = req.params
            const { userIds } = req.body
            const actorId = String(req.user.id)

            if (!forumId || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ message: 'Invalid forumId or userIds' })
            }

            const result = await forumServices.addForumMembers(forumId, userIds, actorId)

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
        const userId = String(req.user?.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        try {
            await assertForumAccess(userId, forumId);
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

    async requestForumJoin(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user?.id);
            const { forumId } = req.params;
            const { message } = req.body || {};
            const request = await communityJoinService.requestForumJoin(userId, forumId, message);
            return res.status(200).json({ request, message: "Forum join request submitted" });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async listForumJoinRequests(req: CustomRequest, res: Response) {
        try {
            const ownerId = String(req.user?.id);
            const { forumId } = req.params;
            const requests = await communityJoinService.listForumJoinRequests(ownerId, forumId);
            return res.status(200).json(requests);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async reviewForumJoinRequest(req: CustomRequest, res: Response) {
        try {
            const ownerId = String(req.user?.id);
            const { requestId } = req.params;
            const approve = req.body?.approve !== false;
            const updated = await communityJoinService.reviewForumJoinRequest(ownerId, requestId, approve);
            return res.status(200).json(updated);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new ForumController();
