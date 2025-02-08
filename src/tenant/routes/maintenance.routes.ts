import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
// import upload from "../../configs/multer";
// import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import MaintenanceController from "../controllers/maintenance.controller";

class MaintenanceRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        // this.router.post('/', upload.array('files'), uploadToCloudinary, adsController.createAd);
        this.router.get('/requests', MaintenanceController.getMaintenances);
    }
}

export default new MaintenanceRouter().router;