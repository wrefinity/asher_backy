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
        this.router.get('/statistics', LandlordMaintenanceControls.getMaintenancesCounts);
        // this.router.get('/statistics', LandlordMaintenanceControls.getCurrentLandlordMaintenances);
        this.router.get('/requests', LandlordMaintenanceControls.getMaintenances);
        this.router.get('/property/:propertyId', LandlordMaintenanceControls.getPropertyMaintenance);

        this.router.post('/accept/:maintenanceId', LandlordMaintenanceControls.acceptMaintenaceRequest);
        this.router.post('/decline/:maintenanceId', LandlordMaintenanceControls.declineMaintenaceRequest);
        this.router.get('/tenants/:tenantId', LandlordMaintenanceControls.getTenantsMaintenances);
        this.router.delete('/:maintenanceId', LandlordMaintenanceControls.deleteMaintenance);
        // whitelisting maintenances
        this.router.post('/whitelist', LandlordMaintenanceControls.createWhitelist);
        this.router.patch('/whitelist/toggle/:subCategoryId', LandlordMaintenanceControls.toggleMaintenanceWhiteList);
        this.router.get('/whitelist', LandlordMaintenanceControls.getWhitelistByLandlord);
        this.router.get('/whitelist/all', LandlordMaintenanceControls.getMaintenanceWithWhiteListed);
        this.router.patch('/whitelist/:whitelistId', LandlordMaintenanceControls.updateWhitelist);
    }

}
// cm57schfs0000refzg0j13jpx - categpory
// cm57swrez0002refzkdqv44x6 - subcategory

export default new LandlordMaintenanceRoute().router;

// {
//     "offer":["100"],
//     "propertyId": "cm1worljs0003uob6eysm7d3y",
//     "description":"pipe breaks",
//     "apartmentId":"clyxgodw70003nuzgt3pkeojg",
//     "categoryId":"cm1l43ogj000013h90b6uy9st",
//     "subcategoryIds":["cm1jpxvzx0001zmipgdyhykza"],
//     "serviceId":"cm1jq290m0001urs2zqm95735",
//     "scheduleDate": "2024-11-15T00:00:00Z"
//   }


