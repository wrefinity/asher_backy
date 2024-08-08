import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import SupportTenantController from "../controllers/support-tenant.controller"


class SupportRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', upload.array('files'), uploadToCloudinary, SupportTenantController.createsupportTenantTicket);
        this.router.get('', SupportTenantController.getSupportTenantTickets)

    }
}

export default new SupportRouter().router;