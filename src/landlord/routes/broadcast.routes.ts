import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import broadcastController from "../controllers/broadcast.controller";

class BroadcastRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/:category', broadcastController.getBroadcastByCategory)
        this.router.get('/', broadcastController.getBroadcastsByLandlord)
        this.router.get('/:broadcastId', broadcastController.getBroadcastById)

    }
}

export default new BroadcastRouter().router;