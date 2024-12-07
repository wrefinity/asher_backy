"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../middlewares/authorize");
const review_controller_1 = __importDefault(require("../controllers/review.controller"));
class ReviewRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.post("/", this.authenticateService.authorize, review_controller_1.default.createReview);
        this.router.get("/user", this.authenticateService.authorize, review_controller_1.default.getCurrentUserReviews);
        this.router.get("/:id", this.authenticateService.authorize, review_controller_1.default.getReviewById);
        this.router.get("/all", this.authenticateService.authorize, review_controller_1.default.getAllReviews);
        this.router.patch("/:id", this.authenticateService.authorize, review_controller_1.default.updateReview);
        this.router.delete("/:id", this.authenticateService.authorize, review_controller_1.default.deleteReview);
        this.router.get('/property/:propertyId', this.authenticateService.authorize, review_controller_1.default.getReviewsByProperty);
    }
}
exports.default = new ReviewRouter().router;
