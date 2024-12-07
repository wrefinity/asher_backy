"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const community_controller_1 = __importDefault(require("../controllers/community.controller"));
class CommunityRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', community_controller_1.default.createCommunity);
        this.router.get('/', community_controller_1.default.getPublicCommunities);
        this.router.get('/owner/:communityId', community_controller_1.default.getCommunityOwner);
        this.router.get('/:communityId/members', community_controller_1.default.getCommunityMembers);
        this.router.get('/:communityId', community_controller_1.default.getCommunityById);
        this.router.patch('/:communityId', community_controller_1.default.updateCommunity);
        this.router.delete('/:communityId', community_controller_1.default.deleteCommunity);
        //invitation url
        this.router.patch('/:inviteCode/invite', community_controller_1.default.joinCommunityViaInviteLink);
        this.router.get('/:communityId/invitations', community_controller_1.default.getInvitationLink);
        // this.router.patch('/:communityId/invitations/:invitationId/accept', CommunityController.acceptCommunityInvitation);
        // this.router.patch('/:communityId/invitations/:invitationId/reject', CommunityController.rejectCommunityInvitation);
    }
}
exports.default = new CommunityRoutes().router;
