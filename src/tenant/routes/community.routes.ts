import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import CommunityController from "../controllers/community.controller"
class CommunityRoutes {
    public router: Router;
    protected authenticateService: Authorize;


    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();

        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', CommunityController.createCommunity);
        this.router.get('/', CommunityController.getPublicCommunities);
        this.router.get('/owner/:communityId', CommunityController.getCommunityOwner);
        this.router.get('/:communityId/members', CommunityController.getCommunityMembers)

        this.router.get('/:communityId', CommunityController.getCommunityById);
        this.router.patch('/:communityId', CommunityController.updateCommunity);
        this.router.delete('/:communityId', CommunityController.deleteCommunity);

        //invitation url
        this.router.patch('/:inviteCode/invite', CommunityController.joinCommunityViaInviteLink);
        this.router.get('/:communityId/invitations', CommunityController.getInvitationLink);
        // this.router.patch('/:communityId/invitations/:invitationId/accept', CommunityController.acceptCommunityInvitation);
        // this.router.patch('/:communityId/invitations/:invitationId/reject', CommunityController.rejectCommunityInvitation);
    }
}

export default new CommunityRoutes().router;