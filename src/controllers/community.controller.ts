import { communityInformationSchema } from "../validations/schemas/community"
import errorService from "../services/error.service";
import { CustomRequest } from "../utils/types"
import { Request, Response } from "express";
import communityServices from "../services/community.services";
import { CommunityVisibility, userRoles } from "@prisma/client";
import { prismaClient } from "..";
import communityJoinService from "../services/community.join.service";
import { resolveOwnerTypeFromRoles } from "../services/community.access.service";

class CommunityController {
    constructor() { }

    async createCommunity(req: CustomRequest, res: Response) {
        const { error, value } = communityInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const { cloudinaryImageUrls, cloudinaryAudioUrls, cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, ...data } = value;
            if (cloudinaryImageUrls && cloudinaryImageUrls.length > 0) {
                data.avatarUrl = cloudinaryImageUrls[0] || null;
                data.bannerUrl = cloudinaryImageUrls[1] || null;
            }
            // Community ownerId must reference users table, not landlords table
            // Always use req.user.id (the authenticated user's ID)
            const ownerId = String(req.user?.id);
            if (!ownerId) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Verify user exists in database before creating community
            const userExists = await prismaClient.users.findUnique({
                where: { id: ownerId }
            });
            if (!userExists) {
                return res.status(404).json({ message: 'User not found in database' });
            }
            
            const community = await communityServices.createCommunity(
                ownerId,
                { ...data },
                resolveOwnerTypeFromRoles(userExists.role)
            )
            return res.status(200).json({ community});

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    async getLandlordCommunities(req: CustomRequest, res: Response) {
        try {
            // For fetching communities, we need to use the same user ID as creation
            // Since communities are owned by users (not landlords), use req.user.id
            const ownerId = String(req.user?.id);
            if (!ownerId) {
                return res.status(404).json({ message: 'User not found' });
            }
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const search = String(req.query.search || '');
            const result = await communityServices.getLandlordCommunities(ownerId, page, limit, search);
            
            // Service now returns standardized structure { communities, pagination }
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


    async joinCommunityViaInviteLink(req: CustomRequest, res: Response) {
        const { inviteCode } = req.params;
        const userId = String(req.user?.id);
        if (!userId) {
            return res.status(404).json({ message: 'User not found' });
        }
        try {
            const membership = await communityServices.joinCommunityViaInviteLink(inviteCode, userId);
            if (!membership) return res.status(404).json({ message: "Community not found or invite link is expired" })
            return res.status(200).json({ message: "Joined community successfully", membership })
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async discoverCommunities(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user?.id);
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 20;
            const search = String(req.query.search || "");
            const result = await communityJoinService.discoverCommunities(userId, page, limit, search);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async requestCommunityJoin(req: CustomRequest, res: Response) {
        try {
            const userId = String(req.user?.id);
            const { communityId } = req.params;
            const { message } = req.body || {};
            const request = await communityJoinService.requestCommunityJoin(userId, communityId, message);
            return res.status(200).json({ request, message: "Join request submitted" });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async listCommunityJoinRequests(req: CustomRequest, res: Response) {
        try {
            const ownerId = String(req.user?.id);
            const { communityId } = req.params;
            const requests = await communityJoinService.listCommunityJoinRequests(ownerId, communityId);
            return res.status(200).json(requests);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async reviewCommunityJoinRequest(req: CustomRequest, res: Response) {
        try {
            const ownerId = String(req.user?.id);
            const { requestId } = req.params;
            const approve = req.body?.approve !== false;
            const updated = await communityJoinService.reviewCommunityJoinRequest(ownerId, requestId, approve);
            return res.status(200).json(updated);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getFilteredCommunities(req: CustomRequest, res: Response) {
        try {
            const visibility = req.query.visibility as CommunityVisibility | undefined;
            if (visibility && ![CommunityVisibility.PUBLIC, CommunityVisibility.PRIVATE].includes(visibility)) {
                return res.status(400).json({ message: "Invalid visibility filter" });
            }
            const search = String(req.query.search || '');
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const userId = String(req.user?.id || '');

            const result = await communityServices.getCommunities({
                visibility,
                search,
                page,
                limit,
                userId: userId || undefined,
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Error fetching communities:', error);
            res.status(500).json({ message: 'Failed to fetch communities' });
        }
    }


    async getCommunityById(req: CustomRequest, res: Response) {
        try {
            const communityId = req.params.communityId;
            const userId = String(req.user?.id);
            
            const community = await communityServices.getCommunityById(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            
            // Check if user can access this community (landlord or their tenant)
            const canAccess = await communityServices.canUserAccessCommunity(userId, communityId);
            if (!canAccess) {
                return res.status(403).json({ message: 'You do not have access to this community. Only the landlord and their tenants can access it.' });
            }
            
            return res.status(200).json(community)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateCommunity(req: CustomRequest, res: Response) {
        const { communityId } = req.params
        const communityOwnerId = String(req.user?.id);
        if (!communityOwnerId) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { error, value } = communityInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const community = await communityServices.getCommunityById(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            if (community.ownerId !== communityOwnerId) return res.status(403).json({ message: "Unauthorized to update this community" })
            const updatedCommunity = await communityServices.updateCommunity(communityId, { ...value })
            return res.status(200).json(updatedCommunity)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async deleteCommunity(req: CustomRequest, res: Response) {
        try {
            // Support both payload formats: { ids: [...] } and { communityIds: [...] }
            const { ids, communityIds } = req.body;
            const idsToDelete = ids || communityIds;

            if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
                return res.status(400).json({ message: 'Invalid or empty list of ids. Expected { ids: [...] } or { communityIds: [...] }' });
            }

            const result = await communityServices.deleteCommunities(idsToDelete);

            return res.status(200).json({
                message: 'Communities deleted successfully',
                count: result.count,
            });
        } catch (error) {
            console.error('Error deleting communities:', error);
            return res.status(500).json({ message: 'Failed to delete communities' });
        }
    }

    async getCommunityOwner(req: CustomRequest, res: Response) {
        try {
            const { communityId } = req.params
            const community = await communityServices.getCommunityOwner(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            return res.status(200).json(community.owner)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }


    async getCommunityMembers(req: CustomRequest, res: Response) {
        const { communityId } = req.params
        const userId = String(req.user?.id);
        try {
            const canAccess = await communityServices.canUserAccessCommunity(userId, communityId);
            if (!canAccess) {
                return res.status(403).json({
                    message: 'You do not have access to this community. Only the landlord and their tenants can access it.',
                });
            }
            const members = await communityServices.getCommunityMembers(communityId)
            if (!members) return res.status(404).json({ message: "Community not found" })
            return res.status(200).json(members)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async addCommunityMembers(req: CustomRequest, res: Response) {
        const { communityId } = req.params;
        const actorId = String(req.user?.id);
        const { userIds } = req.body || {};

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: "userIds must be a non-empty array" });
        }

        try {
            const result = await communityServices.addCommunityMembers(communityId, userIds, actorId);
            return res.status(200).json({
                ...result,
                message: "Members added successfully",
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async removeCommunityMembers(req: CustomRequest, res: Response) {
        const { communityId } = req.params;
        const actorId = String(req.user?.id);
        const { userIds } = req.body || {};

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: "userIds must be a non-empty array" });
        }

        try {
            const result = await communityServices.removeCommunityMembers(communityId, userIds, actorId);
            return res.status(200).json({
                ...result,
                message: "Members removed successfully",
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new CommunityController();