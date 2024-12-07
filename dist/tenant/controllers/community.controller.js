"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const community_1 = require("../schema/community");
const error_service_1 = __importDefault(require("../../services/error.service"));
const community_services_1 = __importDefault(require("../services/community.services"));
const helpers_1 = require("../../utils/helpers");
class CommunityController {
    constructor() { }
    createCommunity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, value } = community_1.communityInformationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const communityOwnerId = String(req.user.id);
                const community = yield community_services_1.default.createCommunity(Object.assign(Object.assign({}, value), { communityOwnerId }));
                const communityLink = yield community_services_1.default.getCommunityInvitationLink(community.id);
                const inviteUrl = (0, helpers_1.getCommunityurl)(communityLink.inviteCode);
                return res.status(200).json(Object.assign(Object.assign({}, community), { inviteUrl }));
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getInvitationLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // we might need to check if the user is the communityOwner
            try {
                const communityId = req.params.communityId;
                const communityLink = yield community_services_1.default.getCommunityInvitationLink(communityId);
                const inviteUrl = (0, helpers_1.getCommunityurl)(communityLink.inviteCode);
                return res.status(200).json({ inviteUrl });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    joinCommunityViaInviteLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { inviteCode } = req.params;
            const userId = String(req.user.id);
            try {
                const membership = yield community_services_1.default.joinCommunityViaInviteLink(inviteCode, userId);
                if (!membership)
                    return res.status(404).json({ message: "Community not found or invite link is expired" });
                return res.status(200).json({ message: "Joined community successfully", membership });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getPublicCommunities(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const communities = yield community_services_1.default.getPublicCommunities();
                if (communities.length < 1)
                    return res.status(200).json({ message: "No communities listed yet" });
                return res.status(200).json(communities);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getPrivateCommunities(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const communities = yield community_services_1.default.getPrivateCommunities();
                if (communities.length < 1)
                    return res.status(200).json({ message: "No communities listed yet" });
                return res.status(200).json(communities);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getCommunityById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const communityId = req.params.communityId;
                const community = yield community_services_1.default.getCommunityById(communityId);
                if (!community)
                    return res.status(404).json({ message: "Community not found" });
                return res.status(200).json(community);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    updateCommunity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { communityId } = req.params;
            const communityOwnerId = String(req.user.id);
            const { error, value } = community_1.communityInformationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const community = yield community_services_1.default.getCommunityById(communityId);
                if (!community)
                    return res.status(404).json({ message: "Community not found" });
                if (community.communityOwnerId !== communityOwnerId)
                    return res.status(403).json({ message: "Unauthorized to update this community" });
                const updatedCommunity = yield community_services_1.default.updateCommunity(communityId, Object.assign({}, value));
                return res.status(200).json(updatedCommunity);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    deleteCommunity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { communityId } = req.params;
            const communityOwnerId = String(req.user.id);
            try {
                const community = yield community_services_1.default.getCommunityById(communityId);
                if (!community)
                    return res.status(404).json({ message: "Community not found" });
                if (community.communityOwnerId !== communityOwnerId)
                    return res.status(403).json({ message: "Unauthorized to delete this community" });
                yield community_services_1.default.deleteCommunity(communityId);
                return res.status(204).json({ message: "Community deleted successfully" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getCommunityOwner(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityId } = req.params;
                const community = yield community_services_1.default.getCommunityOwner(communityId);
                if (!community)
                    return res.status(404).json({ message: "Community not found" });
                return res.status(200).json(community.user);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getCommunityMembers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { communityId } = req.params;
            try {
                const members = yield community_services_1.default.getCommunityMembers(communityId);
                if (!members)
                    return res.status(404).json({ message: "Community not found" });
                return res.status(200).json(members);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new CommunityController();
