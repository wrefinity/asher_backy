import { communityInformationSchema } from "../schema/community"
import errorService from "../../services/error.service";
import { CustomRequest } from "../../utils/types"
import { Request, Response } from "express";
import communityServices from "../services/community.services";
import { getCommunityurl } from "../../utils/helpers";


class CommunityController {
    constructor() { }

    async createCommunity(req: CustomRequest, res: Response) {
        const { error, value } = communityInformationSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ message: error.details[0].message })
        }
        try {
            const communityOwnerId = String(req.user.id)
            const community = await communityServices.createCommunity({ ...value, communityOwnerId })
            const communityLink = await communityServices.getCommunityInvitationLink(community.id)

            const inviteUrl = getCommunityurl(communityLink.inviteCode)
            return res.status(200).json({ ...community, inviteUrl });

        } catch (error) {
            errorService.handleError(error, res)
        }

    }

    async getInvitationLink(req: CustomRequest, res: Response) {
        // we might need to check if the user is the communityOwner
        try {
            const communityId = req.params.communityId;
            const communityLink = await communityServices.getCommunityInvitationLink(communityId)
            const inviteUrl = getCommunityurl(communityLink.inviteCode);
            return res.status(200).json({ inviteUrl });
        } catch (error) {
            errorService.handleError(error, res)
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

    async getPublicCommunities(req: CustomRequest, res: Response) {
        try {
            const communities = await communityServices.getPublicCommunities()
            if (communities.length < 1) return res.status(200).json({ message: "No communities listed yet" })
            return res.status(200).json(communities)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getPrivateCommunities(req: Request, res: Response) {
        try {
            const communities = await communityServices.getPrivateCommunities()
            if (communities.length < 1) return res.status(200).json({ message: "No communities listed yet" })
            return res.status(200).json(communities)
        } catch (error) {
            errorService.handleError(error, res)
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
            if (community.communityOwnerId !== communityOwnerId) return res.status(403).json({ message: "Unauthorized to update this community" })
            const updatedCommunity = await communityServices.updateCommunity(communityId, { ...value })
            return res.status(200).json(updatedCommunity)
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async deleteCommunity(req: CustomRequest, res: Response) {
        const { communityId } = req.params
        const communityOwnerId = String(req.user.id)
        try {
            const community = await communityServices.getCommunityById(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            if (community.communityOwnerId !== communityOwnerId) return res.status(403).json({ message: "Unauthorized to delete this community" })
            await communityServices.deleteCommunity(communityId)
            return res.status(204).json({ message: "Community deleted successfully" })
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    async getCommunityOwner(req: Request, res: Response) {
        try {
            const { communityId } = req.params
            const community = await communityServices.getCommunityOwner(communityId)
            if (!community) return res.status(404).json({ message: "Community not found" })
            return res.status(200).json(community.user)
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