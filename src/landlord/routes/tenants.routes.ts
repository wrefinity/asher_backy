import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import TenantLandlordController from "../controllers/tenant.controller";
import { uploadcsv } from "../../configs/multer";
class TenantsLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
         // tenants modules under landlord
         this.router.get('/get', TenantLandlordController.getTenancies);
         this.router.get('/currents',  TenantLandlordController.getCurrentTenant);
         this.router.get('/previous',  TenantLandlordController.getPreviousTenant);
         this.router.post('/upload', uploadcsv.single("files"), TenantLandlordController.bulkTenantUpload)
 
    }
}

export default new TenantsLandlordRouter().router