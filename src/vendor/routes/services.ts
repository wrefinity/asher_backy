import { Router } from "express";
import VendorServiceController from '../controllers/services.controller';
import { Authorize } from "../../middlewares/authorize";
import { userRoles } from "@prisma/client";
import { validateBody } from "../../middlewares/validation";
import { serviceSchema } from "../validations/schema";
import upload from "../../configs/multer";
import { uploadToCloudinaryGeneric } from "../../middlewares/multerCloudinary";

class VendorServiceRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', validateBody(serviceSchema), VendorServiceController.createService);
        // Portfolio-proof images for the Session-2 service wizard
        // (VENDOR_APP_FLOW_SPEC.md Part 1 §5, refined 2026-07-13).
        this.router.post('/proof-uploads', upload.array('files'), uploadToCloudinaryGeneric, VendorServiceController.uploadProofImages);
        this.router.get('/', VendorServiceController.getAllServices);
        this.router.post('/category/:categoryId', this.authenticateService.authorize, VendorServiceController.getServicesByCategoryAndSubcategories);
        this.router.post('/offer/:categoryId', this.authenticateService.authorize, VendorServiceController.applyOffer);
        this.router.get('/:id', VendorServiceController.getService);
        this.router.patch('/:id', VendorServiceController.updateService);
        this.router.delete('/:id', VendorServiceController.deleteService);
        
    }

}

export default new VendorServiceRoutes().router;