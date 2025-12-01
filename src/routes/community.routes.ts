import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import CommunityController from "../controllers/community.controller"
import communityPostControllers from "../controllers/community-post.controllers";
import communityPostCommentControllers from "../controllers/community.post.comment.controllers";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";
import { userRoles } from "@prisma/client";
import forumRoutes from "./forum.routes";
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
        
        // Specific routes must come before parameterized routes to prevent route conflicts
        this.router.post('/', this.authenticateService.authorizeRole(userRoles.LANDLORD), CommunityController.createCommunity);
        this.router.get('/landlord', this.authenticateService.authorizeRole(userRoles.LANDLORD), CommunityController.getLandlordCommunities);
        this.router.get('/', CommunityController.getFilteredCommunities);
        this.router.delete('/bulk', CommunityController.deleteCommunity);
        
        // Invitation route - must come before /:communityId to prevent conflicts
        this.router.patch('/:inviteCode/invite', CommunityController.joinCommunityViaInviteLink);
        
        // Owner and members routes - specific nested routes before general :communityId
        this.router.get('/owner/:communityId', CommunityController.getCommunityOwner);
        this.router.get('/:communityId/members', CommunityController.getCommunityMembers);

        // Parameterized routes - must come after all specific routes
        this.router.get('/:communityId', CommunityController.getCommunityById);
        this.router.patch('/:communityId', CommunityController.updateCommunity);
        
        // Commented out - implement when ready
        // this.router.get('/:communityId/invitations', CommunityController.getInvitationLink);

        // post session
        this.router.post('/post/:communityId', upload.array('files'), uploadToCloudinary, communityPostControllers.createPost);
        this.router.get('/post/:communityId', communityPostControllers.getCommunityPost);
        this.router.get('/post/recent/:communityId', communityPostControllers.getRecentPosts);
        this.router.get('/post/:communityId/:postId', communityPostControllers.getSingleCommunityPost);
        this.router.get('/post-mine/all', communityPostControllers.getCurrentUserPost);
        this.router.post('/poll-vote', communityPostControllers.voteOnPoll);
        this.router.patch('/post/:postId', communityPostControllers.updateCommunityPost);
        this.router.delete('/post/:postId', communityPostControllers.deleteCommunityPost);

        //likes and views
        this.router.post('/post/:postId/like-dislike', communityPostControllers.likePost);
        this.router.post('/post/:postId/share', communityPostControllers.sharePost);
        this.router.post('/post/:postId/view', communityPostControllers.viewPost);
        this.router.get('/post-likes/:postId', communityPostControllers.getPostLikes);
        this.router.get('/post-views/:postId', communityPostControllers.getPostViews);
        this.router.get('/post-shares/:postId', communityPostControllers.getPostShares);

        //pin/bookmark
        this.router.patch('/post/:postId/pin-toggle', communityPostControllers.togglePinPost);
        this.router.get('/post-pinned/mine', communityPostControllers.getPinnedPosts);
        this.router.post('/post-comment', communityPostCommentControllers.create);
        this.router.get('/post-comment/:postId', communityPostCommentControllers.getByPost);
        this.router.get('/post-comment/comment/:commentId', communityPostCommentControllers.getById);
        this.router.post('/post-comment/like-dislike/toggle', communityPostCommentControllers.toggleCommentLike);
        this.router.delete('/post-comment/:commentId', communityPostCommentControllers.delete);
        this.router.use("/forums", forumRoutes)
    }
}

export default new CommunityRoutes().router;