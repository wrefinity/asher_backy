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
        this.router.post('/', upload.array('files'), uploadToCloudinary, this.authenticateService.authorize, adsController.createAd);
        this.router.get('/listed', this.authenticateService.authorize, adsController.getAllListedAds);
        this.router.get('/:adsId', this.authenticateService.authorize, adsController.getAdsById);
        this.router.patch('/:adsId/list', this.authenticateService.authorize, this.authenticateService.authorizeRole('Admin'), adsController.listAd);
        this.router.get('/location', this.authenticateService.authorize, adsController.getAdsByLocation)
        this.router.get('/:userId', this.authenticateService.authorize, adsController.getAdsByUser)
        this.router.get('/:adsId/stats', this.authenticateService.authorize, adsController.getAdStats)
        this.router.patch('/:adsId', this.authenticateService.authorize, adsController.incrementAdsStats)
    }
}

export default new AdsRouter().router;