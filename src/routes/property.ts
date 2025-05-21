import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import PropertyController from "../controllers/property.controller";
import PropertDocumentRouter from "./propertydoc"
import BookingRouter from "./booking"
import propertyController from "../controllers/property.controller";
class PropertyRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
    //     this.router.post("/property/features",  this.authenticateService.authorize, PropertyController.createFeatures);
    //     this.router.get("/property/features",  this.authenticateService.authorize, PropertyController.getFeatures);
        this.router.post("/property/enquire",  this.authenticateService.authorize, PropertyController.enquireProperty);
        this.router.use("/docs", PropertDocumentRouter);
        this.router.use("/bookings", BookingRouter);
        this.router.get('/property', PropertyController.getProperty)
        this.router.get('/property/unit/:id', PropertyController.getPropsUnit)
        this.router.get('/property/units/:propertyId', PropertyController.getPropsUnitsByPropertyId)
        this.router.get('/property/room/:id', PropertyController.getPropsRoom)
        this.router.get('/property/rooms/:propertyId', PropertyController.getPropsRoomByPropertyId)
        this.router.get('/property/landlord/:landlordId', PropertyController.getPropertyListedByLandlord)
        this.router.post('/property/likes/:propertyId', this.authenticateService.authorize, PropertyController.createLikeProperty)
        this.router.get('/property/user/likes', this.authenticateService.authorize, PropertyController.getLikePropertyHistories)
        this.router.get('/property/:id', PropertyController.getPropertyById)
        this.router.get('/property/state', PropertyController.getPropertyByState)
        this.router.get('/property/listing', PropertyController.getListedProperties)
        this.router.get('/property/maintenance/:propertyId', PropertyController.getPropsMaintenance)
        this.router.get('/property/vendors/:propertyId', PropertyController.getVendorsServicesOnProps)
        this.router.patch("/property/view/:propertyId",  this.authenticateService.authorize, PropertyController.viewProperty);
    }
}

export default new PropertyRouter().router
