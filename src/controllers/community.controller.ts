import { communityInformationSchema } from "../validations/schemas/community"
import errorService from "../services/error.service";
import { CustomRequest } from "../utils/types"
import { Request, Response } from "express";
import communityServices from "../services/community.services";
import { getCommunityurl } from "../utils/helpers";
import { CommunityVisibility } from "@prisma/client";

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
            const ownerId = String(req.user.id)
            const community = await communityServices.createCommunity({ ...data, ownerId })
            return res.status(200).json({ community, message: "Community created successfully" });

        } catch (error) {
            errorService.handleError(error, res)
        }

    }
    async getLandlordCommunities(req: CustomRequest, res: Response) {
        try {
            const ownerId = String(req.user.id);
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;
            const search = String(req.query.search || '');

            const result = await communityServices.getLandlordCommunities(ownerId, page, limit, search);

            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


    async joinCommunityViaInviteLink(req: CustomRequest, res: Response) {
        const { inviteCode } = req.params;
        const userId = String(req.user.id);
        try {
            const membership = await communityServices.joinCommunityViaInviteLink(inviteCode, userId);
            if (!membership) return res.status(404).json({ message: "Community not found or invite link is expired" })
            return res.status(200).json({ message: "Joined community successfully", membership })
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getFilteredCommunities(req: Request, res: Response) {
        try {
            const visibility = req.query.visibility as CommunityVisibility | undefined;
            if (visibility && ![CommunityVisibility.PUBLIC, CommunityVisibility.PRIVATE].includes(visibility)) {
                return res.status(400).json({ message: "Invalid visibility filter" });
            }
            const search = String(req.query.search || '');
            const page = parseInt(String(req.query.page)) || 1;
            const limit = parseInt(String(req.query.limit)) || 10;

            const result = await communityServices.getCommunities({
                visibility,
                search,
                page,
                limit,
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
            const community = await communityServices.getCommunityById(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            return res.status(200).json(community)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async updateCommunity(req: CustomRequest, res: Response) {
        const { communityId } = req.params
        const communityOwnerId = String(req.user.id)
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
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'Invalid or empty list of ids.' });
            }

            const result = await communityServices.deleteCommunities(ids);

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
        try {
            const members = await communityServices.getCommunityMembers(communityId)
            if (!members) return res.status(404).json({ message: "Community not found" })
            return res.status(200).json(members)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new CommunityController();