"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const community_post_controllers_1 = __importDefault(require("../controllers/community-post.controllers"));
const multer_1 = __importDefault(require("../../configs/multer"));
const multerCloudinary_1 = require("../../middlewares/multerCloudinary");
class CommunityPostRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/:communityId', multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, community_post_controllers_1.default.createPost);
        this.router.get('/:communityId/post/:communityPostId', community_post_controllers_1.default.getSingleCommunityPost);
        this.router.get('/:communityId', community_post_controllers_1.default.getCommunityPost);
        this.router.patch('/:communityPostId', community_post_controllers_1.default.updateCommunityPost);
        this.router.delete('/:communityPostId', community_post_controllers_1.default.deleteCommunityPost);
        //likes and views
        this.router.post('/:communityPostId/like', community_post_controllers_1.default.likePost);
        this.router.post('/:communityPostId/view', community_post_controllers_1.default.viewPost);
        this.router.get('/:communityPostId/likes', community_post_controllers_1.default.getPostLikes);
        this.router.get('/:communityPostId/views', community_post_controllers_1.default.getPostViews);
    }
}
exports.default = new CommunityPostRouter().router;
