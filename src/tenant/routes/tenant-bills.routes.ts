import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import adsController from "../controllers/ads.controller";
import tenantBillsControllers from "../controllers/tenant-bills.controllers";

class TenantBillRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/bills', tenantBillsControllers.getTenantBill);
        this.router.get('/overdue-bills', tenantBillsControllers.getOverdueBills);
        this.router.get('/upcoming-bills', tenantBillsControllers.getUpcomingBills);
    }
}

export default new TenantBillRouter().router;