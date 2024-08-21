import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import LandlordControl from "../landlord/controllers/landlord.controller";
import landlordController from "../landlord/controllers/landlord.controller";

class LandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        

        this.router.get(
            '/',
            this.authenticateService.authorize,
            landlordController.getAllLandlords
        );

        this.router.get(
            '/:id',
            this.authenticateService.authorize,
            landlordController.getLandlordById
        );

        this.router.patch(
            '/:id',
            this.authenticateService.authorize,
            landlordController.updateLandlord
        );

        this.router.delete(
            '/:id',
            this.authenticateService.authorize,
            LandlordControl.deleteLandlord
        );
        this.router.get(
            '/current-tenants',
            this.authenticateService.authorize,
            LandlordControl.getCurrentTenants
        );
        this.router.get(
            '/previous-tenants',
            this.authenticateService.authorize,
            LandlordControl.getPreviousTenants
        );
        this.router.get(
            '/jobs/current',
            this.authenticateService.authorize,
            LandlordControl.getCurrentJobsForLandordProperties
        );
        this.router.get(
            '/jobs/completed',
            LandlordControl.getCompletedVendorsJobsForLandordProperties
        );
    }
}

export default new LandlordRouter().router