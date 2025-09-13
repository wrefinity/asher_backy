import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
// import upload from "../../configs/multer";
// import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import MaintenanceController from "../controllers/maintenance.controller";
import { validateBody } from "../../middlewares/validation";
import { maintenanceSchema } from "../../validations/schemas/maintenance.schema";

class MaintenanceRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // this.router.post('/', upload.array('files'), uploadToCloudinary, adsController.createAd);
        this.router.post('/requests', this.authenticateService.requireTenantContext(), validateBody(maintenanceSchema), MaintenanceController.createMaintenance);
        this.router.get('/requests', this.authenticateService.requireTenantContext(), MaintenanceController.getMaintenances);
    }
}

export default new MaintenanceRouter().router;