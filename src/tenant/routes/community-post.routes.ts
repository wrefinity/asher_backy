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
        this.router.use(this.authenticateService.authorize);
        this.router.post('/:communityId', upload.array('files'), uploadToCloudinary, communityPostControllers.createPost);
        this.router.get('/:communityId/post/:communityPostId', communityPostControllers.getSingleCommunityPost);
        this.router.get('/:communityId', communityPostControllers.getCommunityPost);
        this.router.patch('/:communityPostId', communityPostControllers.updateCommunityPost);
        this.router.delete('/:communityPostId', communityPostControllers.deleteCommunityPost);

        //likes and views
        this.router.post('/:communityPostId/like', communityPostControllers.likePost);
        this.router.post('/:communityPostId/view', communityPostControllers.viewPost);
        this.router.get('/:communityPostId/likes', communityPostControllers.getPostLikes);
        this.router.get('/:communityPostId/views', communityPostControllers.getPostViews);
    }
}

export default new CommunityPostRouter().router;