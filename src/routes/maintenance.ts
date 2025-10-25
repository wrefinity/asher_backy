import { Router } from "express";
import MaintenanceController from '../controllers/maintenance.controller';
import { Authorize } from "../middlewares/authorize";
import { validateBody } from "../middlewares/validation";
import { maintenanceSchema, maintenanceChatSchema } from "../validations/schemas/maintenance.schema";


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
        this.router.post('/chats/:maintenanceId', this.authenticateService.authorize, validateBody(maintenanceChatSchema), MaintenanceController.createMaintenanceChat);
        this.router.get('/chats/:maintenanceId', this.authenticateService.authorize,  MaintenanceController.getMaintenanceChat);
        this.router.get('/request-cancel/:maintenanceId', this.authenticateService.authorize,  MaintenanceController.requestMaintenanceCancellation);
        this.router.post('/reschedule/:maintenanceId', this.authenticateService.authorize,  MaintenanceController.rescheduleMaintenanceController);
        this.router.post('/schedule/:maintenanceId', this.authenticateService.authorize,  MaintenanceController.scheduleMaintenanceDate);
        this.router.post('/whitelisted', this.authenticateService.authorize,  MaintenanceController.checkIfMaintenanceWhitelisted);
        this.router.get('/', MaintenanceController.getAllMaintenances);
        this.router.get('/:id', this.authenticateService.authorize, MaintenanceController.getMaintenanceById);
        this.router.post('/', this.authenticateService.authorize, validateBody(maintenanceSchema),MaintenanceController.createMaintenance);
        // this.router.post('/', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary,  MaintenanceController.createMaintenance);
        this.router.put('/:id', this.authenticateService.authorize, MaintenanceController.updateMaintenance);
        this.router.delete('/:id', this.authenticateService.authorize, MaintenanceController.deleteMaintenance);
    }
}

export default new MaintenaceRoutes().router;
