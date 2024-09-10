import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";
import LandlordControl from "../landlord/controllers/landlord.controller";
import landlordController from "../landlord/controllers/landlord.controller";
import ApplicationController from "../landlord/controllers/applicant.controller";
import TenantsController from "../landlord/controllers/tenant.controller";
import PropertyController from "../landlord/controllers/properties.controller";
import AppartmentController from "../landlord/controllers/apartment.controller";

class LandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.use(this.authenticateService.authorizeRole("LANDLORD"))
        this.router.get(
            '/',
            landlordController.getAllLandlords
        );

        this.router.get(
            '/:id',
            landlordController.getLandlordById
        );

        this.router.patch(
            '/:id',
            landlordController.updateLandlord
        );

        this.router.delete(
            '/:id',
            LandlordControl.deleteLandlord
        );
        this.router.get(
            '/current-tenants',
            LandlordControl.getCurrentTenants
        );
        this.router.get(
            '/previous-tenants',
            LandlordControl.getPreviousTenants
        );
        this.router.get(
            '/jobs/current',
            LandlordControl.getCurrentJobsForLandordProperties
        );
        this.router.get(
            '/jobs/completed',
            LandlordControl.getCompletedVendorsJobsForLandordProperties
        );
        // applications modules under landlord
        this.router.get('/application/pending',  ApplicationController.getApplicationsPending);
        this.router.get('/application/completed',  ApplicationController.getApplicationsPending);
        this.router.get('/application/statistics',  ApplicationController.getApplicationStatistics);
        
        // tenants modules under landlord
        this.router.get('/tenants/', TenantsController.getTenancies);
        this.router.get('/tenants/currents',  TenantsController.getCurrentTenant);
        this.router.get('/tenants/previous',  TenantsController.getPreviousTenant);

        // landlord properties
        this.router.get('/property/landlord', PropertyController.getCurrentLandlordProperties)
        this.router.post('/property', upload.array('files'), uploadToCloudinary, PropertyController.createProperty)
        this.router.delete('/property/:propertyId', PropertyController.deleteLandlordProperties)
        
        // appartments
        this.router.get('/apartment', AppartmentController.getCurrentLandlordAppartments)
        this.router.post('/apartment', upload.array('files'), uploadToCloudinary, AppartmentController.createApartment)
        this.router.patch('/apartment/:apartmentId', upload.array('files'), uploadToCloudinary, AppartmentController.updateApartment)
        this.router.delete('/apartment/:apartmentId', AppartmentController.deleteApartments)
          
    }
}

export default new LandlordRouter().router