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
const error_service_1 = __importDefault(require("../../services/error.service"));
const community_post_services_1 = __importDefault(require("../services/community-post.services"));
const community_1 = require("../schema/community");
class CommunityPostController {
    constructor() { }
    createPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, value } = community_1.communityPostSchema.validate(req.body);
            if (error)
                return res.status(400).json({ error: error.details[0].message });
            try {
                const userId = String(req.user.id);
                const communityId = req.params.communityId;
                const attachmentUrl = req.body.cloudinaryUrls && req.body.cloudinaryUrls.length > 0 ? req.body.cloudinaryUrls[0] : null;
                const post = yield community_post_services_1.default.createCommunityPost(Object.assign(Object.assign({}, value), { communityId,
                    userId, imageUrl: attachmentUrl }));
                return res.status(201).json(post);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getCommunityPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityId } = req.params;
                const post = yield community_post_services_1.default.getCommunityPosts(communityId);
                if (!post)
                    return res.status(404).json({ message: "Post not found" });
                return res.status(200).json(post);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getSingleCommunityPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityId, communityPostId } = req.params;
                const community = yield community_post_services_1.default.getSingleCommunityPost(communityId, communityPostId);
                return res.status(200).json(community);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    updateCommunityPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const communityPostData = req.body;
            try {
                const { communityPostId } = req.params;
                const communityPost = yield community_post_services_1.default.getCommunityPostById(communityPostId);
                if (!communityPost)
                    return res.status(404).json({ message: "Post not found" });
                const userId = String(req.user.id);
                if (communityPost.userId !== userId)
                    return res.status(403).json({ message: "Unauthorized to edit this post" });
                const updatedPost = yield community_post_services_1.default.updateCommunityPost(communityPostId, communityPostData);
                return res.status(200).json(updatedPost);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    deleteCommunityPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityPostId } = req.params;
                const communityPost = yield community_post_services_1.default.getCommunityPostById(communityPostId);
                if (!communityPost)
                    return res.status(404).json({ message: "Post not found" });
                const userId = String(req.user.id);
                if (communityPost.userId !== userId)
                    return res.status(403).json({ message: "Unauthorized to delete this post" });
                yield community_post_services_1.default.deleteCommunityPost(communityPostId);
                return res.status(204).json({ message: "Post deleted successfully" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    likePost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityPostId } = req.params;
                const userId = String(req.user.id);
                const result = yield community_post_services_1.default.likeCommunityPost(communityPostId, userId);
                return res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    viewPost(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityPostId } = req.params;
                const userId = String(req.user.id);
                const result = yield community_post_services_1.default.viewCommunityPost(communityPostId, userId);
                return res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getPostLikes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityPostId } = req.params;
                const page = parseInt(req.query.page) || 1;
                const pageSize = parseInt(req.query.pageSize) || 20;
                const likes = yield community_post_services_1.default.getPostLikes(communityPostId, page, pageSize);
                return res.status(200).json(likes);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getPostViews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { communityPostId } = req.params;
                const page = parseInt(req.query.page) || 1;
                const pageSize = parseInt(req.query.pageSize) || 20;
                const views = yield community_post_services_1.default.getPostViews(communityPostId, page, pageSize);
                return res.status(200).json(views);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new CommunityPostController();
