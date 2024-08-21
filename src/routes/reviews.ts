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
        this.router.get("/:id", this.authenticateService.authorize, ReviewController.getReviewById);
        this.router.get("/reviews", this.authenticateService.authorize, ReviewController.getAllReviews);
        this.router.patch("/:id", this.authenticateService.authorize, ReviewController.updateReview);
        this.router.delete("/:id", this.authenticateService.authorize, ReviewController.deleteReview);
        this.router.get('/property/:propertyId', this.authenticateService.authorize,ReviewController.getReviewsByProperty);
    }
}

export default new ReviewRouter().router