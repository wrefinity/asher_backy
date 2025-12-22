import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import ReviewController from "../controllers/review.controller";
class ReviewRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post("/", this.authenticateService.authorize, ReviewController.createReview);
        this.router.get("/user", this.authenticateService.authorize, ReviewController.getCurrentUserReviews);
        this.router.get("/current-user", this.authenticateService.authorize, ReviewController.getUserReviews);
        this.router.get("/tenant/:tenantId", this.authenticateService.authorize, ReviewController.getReviewsByTenant);
        this.router.get("/:id", this.authenticateService.authorize, ReviewController.getReviewById);
        this.router.get("/all", this.authenticateService.authorize, ReviewController.getAllReviews);
        this.router.patch("/:id", this.authenticateService.authorize, ReviewController.updateReview);
        this.router.delete("/:id", this.authenticateService.authorize, ReviewController.deleteReview);
        this.router.get('/property/:propertyId', this.authenticateService.authorize,ReviewController.getReviewsByProperty);
    }
}

export default new ReviewRouter().router