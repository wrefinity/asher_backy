import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import communityPostControllers from "../controllers/community-post.controllers";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";

class CommunityPostRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/:communityId', upload.array('files'), uploadToCloudinary, this.authenticateService.authorize, communityPostControllers.createPost);
        this.router.get('/:communityId/post/:communityPostId', this.authenticateService.authorize, communityPostControllers.getSingleCommunityPost);
        this.router.get('/:communityId', this.authenticateService.authorize, communityPostControllers.getCommunityPost);
        this.router.patch('/:communityPostId', this.authenticateService.authorize, communityPostControllers.updateCommunityPost);
        this.router.delete('/:communityPostId', this.authenticateService.authorize, communityPostControllers.deleteCommunityPost);

        //likes and views
        this.router.post('/:communityPostId/like', this.authenticateService.authorize, communityPostControllers.likePost);
        this.router.post('/:communityPostId/view', this.authenticateService.authorize, communityPostControllers.viewPost);
        this.router.get('/:communityPostId/likes', this.authenticateService.authorize, communityPostControllers.getPostLikes);
        this.router.get('/:communityPostId/views', this.authenticateService.authorize, communityPostControllers.getPostViews);
    }
}

export default new CommunityPostRouter().router;