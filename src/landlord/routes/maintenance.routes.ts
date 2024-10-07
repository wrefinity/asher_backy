import { Router } from "express";
import LandlordMaintenanceControls from '../controllers/maintenance.controller';
import { Authorize } from "../../middlewares/authorize";

class LandlordMaintenanceRoute {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get('/statistics', LandlordMaintenanceControls.getCurrentLandlordMaintenances);
        this.router.get('/', LandlordMaintenanceControls.getMaintenances);
        this.router.get('/property/:propertyId', LandlordMaintenanceControls.getPropertyMaintenance);
        this.router.post('/whitelist', LandlordMaintenanceControls.createWhitelist);
        this.router.post('/accept/:maintenanceId', LandlordMaintenanceControls.acceptMaintenaceRequest);
        this.router.post('/decline/:maintenanceId', LandlordMaintenanceControls.declineMaintenaceRequest);
        this.router.get('/whitelist', LandlordMaintenanceControls.getWhitelistByLandlord);
        this.router.get('/tenants/tenantId', LandlordMaintenanceControls.getTenantsMaintenances);
        this.router.patch('/whitelist/:whitelistId', LandlordMaintenanceControls.updateWhitelist);
    }

}

export default new LandlordMaintenanceRoute().router;
