import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import ForumController from "../controllers/community.forum.controller"
import ForumThreadControllers from "../controllers/community.forum.post.controllers";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";
import { userRoles } from "@prisma/client";
class ForumRoutes {
    public router: Router;
    protected authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    // Apply authentication middleware to all routes
    private initializeRoutes(): void {
        this.router.post('/', this.authenticateService.authorizeRole(userRoles.ADMIN), ForumController.createForum);  
        this.router.get('/all', ForumController.getFilteredForums);
        this.router.get('/recent/:communityId', ForumController.getRecentForums);
        this.router.post('/:forumId/members', ForumController.addMembersToForum)
        this.router.get('/:forumId/members', ForumController.getForumMembers)
        this.router.delete('/:forumId/members', ForumController.removeForumMembers)

        this.router.get('/:forumId', ForumController.getForumById);
        this.router.patch('/:forumId', ForumController.updateForum);
        this.router.delete('/bulk', ForumController.deleteForum);

     
        // post session
        this.router.post('/thread-polling/vote', ForumThreadControllers.voteOnPoll);
        this.router.post('/thread/:forumId', upload.array('files'), uploadToCloudinary, ForumThreadControllers.createThread);
        this.router.get('/thread/:forumId', ForumThreadControllers.getForumThread);
        this.router.get('/thread/:forumId/:threadId', ForumThreadControllers.getSingleForumThread);
        this.router.get('/thread-mine/all', ForumThreadControllers.getCurrentUserThread);
        this.router.get('/thread-contributors/:threadId', ForumThreadControllers.getTopContributors);
        this.router.get('/thread-related/:threadId', ForumThreadControllers.getRelatedThreads);
        this.router.patch('/thread/:threadId', ForumThreadControllers.updateForumThread);
        this.router.get('/thread-pinned/mine', ForumThreadControllers.getMyPinnedThreads);
        this.router.patch('/thread/:threadId/pin-toggle', ForumThreadControllers.togglePin);
        this.router.delete('/thread/:threadId', ForumThreadControllers.deleteForumThread);

        //likes and views
        this.router.post('/thread/:threadId/like-dislike', ForumThreadControllers.likeDiscussionThread);
        this.router.get('/thread-likes/:threadId', ForumThreadControllers.getLikedDiscussionThread);
        this.router.post('/thread-comments/:commentId/share', ForumThreadControllers.shareDiscussionComment);
        this.router.get('/thread-comments/:threadId', ForumThreadControllers.getThreadCommentsWithReplies);
        this.router.post('/thread-comments/:threadId', ForumThreadControllers.makeThreadComment);
        this.router.post('/thread-comments/replies/:commentId', ForumThreadControllers.replyToComment);
        // this.router.post('/post/:postId/view', communityPostControllers.viewPost);
        // this.router.get('/post-likes/:postId', communityPostControllers.getPostLikes);
        // this.router.get('/post-views/:postId', communityPostControllers.getPostViews);
        // this.router.get('/post-shares/:postId', communityPostControllers.getPostShares);
    }
}

export default new ForumRoutes().router;