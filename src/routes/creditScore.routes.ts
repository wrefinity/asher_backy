import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import CreditScoreController from "../controllers/creditScore.controller";

class CreditScoreRouter {
    public router: Router;
    authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get credit score (for own user or authorized landlord)
        this.router.get(
            "/:userId",
            this.authenticateService.authorize,
            CreditScoreController.getCreditScore
        );

        // Get detailed credit score breakdown
        this.router.get(
            "/:userId/breakdown",
            this.authenticateService.authorize,
            CreditScoreController.getCreditScoreBreakdown
        );

        // Update/Recalculate credit score
        this.router.post(
            "/:userId/update",
            this.authenticateService.authorize,
            CreditScoreController.updateCreditScore
        );

        // Get own credit score (convenience route - must come before /:userId)
        this.router.get(
            "/me",
            this.authenticateService.authorize,
            (req: any, res: any) => {
                req.params = { userId: req.user?.id };
                CreditScoreController.getCreditScore(req, res);
            }
        );
    }
}

export default new CreditScoreRouter().router;

