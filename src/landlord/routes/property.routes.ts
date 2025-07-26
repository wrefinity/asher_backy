import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import PropertyController from "../controllers/properties.controller";
import SettingController from "../controllers/setting.controller";
import upload, { uploadcsv } from "../../configs/multer";
import { uploadToCloudinary, handlePropertyUploads } from "../../middlewares/multerCloudinary";

class ApartmentLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        // landlord properties
        this.router.get('/property/rentals', PropertyController.categorizedPropsInRentals)
        this.router.post('/property/property-listing', PropertyController.createPropertyListing);
        this.router.delete('/property/property-unlisting/:propertyId', PropertyController.unListPropertyListing);
        this.router.get('/property/property-listing', PropertyController.getLandlordPropertyListing);
        this.router.get('/property/property-listing/active', PropertyController.getActivePropsListing);
        this.router.get('/property/property-listing/inactive', PropertyController.getInactivePropsListing);
        this.router.patch('/property/property-listing/:listedId', PropertyController.updatePropsListing);
        this.router.get('/property', PropertyController.getCurrentLandlordProperties)
        // this.router.post('/property', upload.array('files'), uploadToCloudinary, PropertyController.createProperty)
        this.router.post('/create', upload.array("files"), handlePropertyUploads, PropertyController.createProperties)
        this.router.post('/create-room', upload.array("files"), handlePropertyUploads, PropertyController.createRoom)
        this.router.post('/create-unit', upload.array("files"), handlePropertyUploads, PropertyController.createUnit)
        this.router.post('/upload', uploadcsv.single("files"), PropertyController.bulkPropsUpload)
        this.router.delete('/property/:propertyId', PropertyController.deleteLandlordProperties)
        this.router.patch('/property/status/:propertyId', PropertyController.updatePropertyAvailability)
        this.router.get('/property/tenants/:propertyId', PropertyController.getTenantsForProperty)
        this.router.get('/property/without-tenants', PropertyController.getPropertiesWithoutTenants)
        this.router.get('/property/user-preferences/:userId', PropertyController.getPropertyBasedOnUserPreference)

        //   settings 
        this.router.post('/settings', SettingController.createPropApartmentSetting);
        this.router.get('/settings', SettingController.getAllPropsApartSetting);
        this.router.get('/settings/:id', SettingController.getById);
        this.router.patch('/settings/:id', SettingController.updatePropsApartSetting);
        this.router.delete('/settings/:id', SettingController.deletePropsApartmentSetting);
        // Route to create a global setting
        this.router.post('/settings-global', SettingController.createGlobalSetting);
        // Route to get all global settings
        this.router.get('/settings-global', SettingController.getAllGlobalSettings);
        this.router.get('/settings/global/application-fee/:id', SettingController.getApplicationFee);
        // Route to update a specific global setting
        this.router.put('/settings/global/:id', SettingController.updateLandlordGlobalSetting);
        // Route to delete a specific global setting
        this.router.delete('/settings/global/:id', SettingController.deleteLandlordGlobalSetting);

    }
}

export default new ApartmentLandlordRouter().router