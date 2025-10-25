import { Router } from "express";
import MaintenanceController from '../controllers/maintenance.controller';
import MaintenanceGeneralController from '../../controllers/maintenance.controller';
import { Authorize } from "../../middlewares/authorize";
import { handlePropertyUploads } from '../../middlewares/multerCloudinary';
import upload from "../../configs/multer";



class MaintenaceRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.post('/accept/:maintenanceId', this.authenticateService.authorize, MaintenanceController.acceptJob);
        this.router.get('/request-confirm/:maintenanceId', this.authenticateService.authorize, MaintenanceController.confirmCancellationByVendor);
        this.router.post('/completed/:maintenanceId', this.authenticateService.authorize, MaintenanceController.updateMaintenanceToCompleted);
        this.router.post('/reschedule/:maintenanceId', this.authenticateService.authorize, MaintenanceGeneralController.rescheduleMaintenanceController);
        this.router.post('/schedule/:maintenanceId', this.authenticateService.authorize, MaintenanceGeneralController.scheduleMaintenanceDate);
        this.router.get('/', MaintenanceController.getMaintenances);
        this.router.get('/upload-image-start/:maintenanceId', this.authenticateService.authorize,  upload.array("files"), handlePropertyUploads,   MaintenanceController.uploadStartAttachments);
        this.router.get('/upload-image-end/:maintenanceId', this.authenticateService.authorize,  upload.array("files"), handlePropertyUploads, MaintenanceController.uploadEndAttachments);
        this.router.get('/statuses', MaintenanceController.getMaintenancesByStatus);
        this.router.get('/:id', this.authenticateService.authorize, MaintenanceController.getMaintenancesById);
        this.router.patch('/:id', this.authenticateService.authorize, MaintenanceController.updateStatus);
    }
}

export default new MaintenaceRoutes().router;
