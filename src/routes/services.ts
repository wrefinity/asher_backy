import { Router } from "express";
import VendorServiceController from '../vendor/controllers/services.controller';
import MaintenanceServiceController from '../vendor/controllers/maintenance.controller';
import { Authorize } from "../middlewares/authorize";
import { userRoles } from "@prisma/client";
import { uploadToCloudinary, uploadToCloudinaryGeneric } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
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
        this.router.post('/', this.authenticateService.authorizeRole(userRoles.VENDOR), VendorServiceController.createService);
        this.router.get('/', VendorServiceController.getAllServices);
        this.router.post('/category/:categoryId', this.authenticateService.authorize, VendorServiceController.getServicesByCategoryAndSubcategories);
        this.router.post('/offer/:categoryId', this.authenticateService.authorize, VendorServiceController.applyOffer);
        this.router.get('/:id', VendorServiceController.getService);
        this.router.patch('/:id', this.authenticateService.authorize, VendorServiceController.updateService);
        this.router.delete('/:id', this.authenticateService.authorize, VendorServiceController.deleteService);
        this.router.get('/maintenances/all', this.authenticateService.authorize, MaintenanceServiceController.getMaintenances);

        // Vendor actions
        this.router.post("/:maintenanceId/accept", MaintenanceServiceController.acceptJob);
        this.router.post("/:maintenanceId/start-attachments",  upload.array("files"), uploadToCloudinaryGeneric, MaintenanceServiceController.uploadStartAttachments);
        this.router.post("/:maintenanceId/end-attachments",  upload.array("files"), uploadToCloudinaryGeneric, MaintenanceServiceController.uploadEndAttachments);

        // Status changes
        this.router.post("/:maintenanceId/status", MaintenanceServiceController.updateStatus);

        // History
        this.router.get("/:maintenanceId/history", MaintenanceServiceController.getStatusHistory);
    }

}

export default new VendorServiceRoutes().router;