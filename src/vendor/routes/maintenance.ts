import { Router } from "express";
import MaintenanceController from '../controllers/maintenance.controller';
import MaintenanceGeneralController from '../../controllers/maintenance.controller';
import { Authorize } from "../../middlewares/authorize";
import { uploadToCloudinaryGeneric } from '../../middlewares/multerCloudinary';
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
        this.router.get('/all', MaintenanceController.getMaintenances);

        // Vendor actions
        this.router.post("/:maintenanceId/accept", MaintenanceController.acceptJob);
        this.router.post("/:maintenanceId/start-attachments", upload.array("files"), uploadToCloudinaryGeneric, MaintenanceController.uploadStartAttachments);
        this.router.post("/:maintenanceId/end-attachments", upload.array("files"), uploadToCloudinaryGeneric, MaintenanceController.uploadEndAttachments);

        // Status changes
        this.router.post("/:maintenanceId/status", MaintenanceController.updateStatus);

        // History
        this.router.get("/:maintenanceId/history", MaintenanceController.getStatusHistory);

        // Update your routes
        this.router.post("/:maintenanceId/reschedule", MaintenanceController.rescheduleMaintenance);
        this.router.post("/:maintenanceId/pause", MaintenanceController.pauseMaintenance);
        this.router.post("/:maintenanceId/resume", MaintenanceController.resumeMaintenance);

        // main ==================================
        this.router.get('/request-confirm/:maintenanceId', this.authenticateService.authorize, MaintenanceController.confirmCancellationByVendor);
        this.router.post('/completed/:maintenanceId', this.authenticateService.authorize, MaintenanceController.updateMaintenanceToCompleted);
        this.router.post('/reschedule/:maintenanceId', this.authenticateService.authorize, MaintenanceGeneralController.rescheduleMaintenanceController);
        this.router.post('/schedule/:maintenanceId', this.authenticateService.authorize, MaintenanceGeneralController.scheduleMaintenanceDate);
        this.router.get('/statuses', MaintenanceController.getMaintenancesByStatus);
        this.router.get('/:maintenanceId', MaintenanceController.getMaintenancesById);

    }
}

export default new MaintenaceRoutes().router;
