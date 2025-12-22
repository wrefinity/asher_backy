import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import adsController from "../controllers/ads.controller";

class AdsRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.post('/', upload.array('files'), uploadToCloudinary, adsController.createAd);
        this.router.get('/listed', adsController.getAllListedAds);
        this.router.get('/premium-banner', adsController.getPremiumBannerAds);
        this.router.get('/expenses/:userId', adsController.getAdExpenses);
        this.router.get('/:adsId', adsController.getAdsById);
        this.router.patch('/:adsId/list', this.authenticateService.authorizeRole, adsController.listAd);
        this.router.get('/post/location', adsController.getAdsByLocation);
        this.router.get('/user/:userId', adsController.getAdsByUser);
        this.router.get('/:adsId/stats', adsController.getAdStats);
        this.router.patch('/:adsId/stats', adsController.incrementAdsStats);
    }
}

export default new AdsRouter().router;