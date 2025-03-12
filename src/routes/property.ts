import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import PropertyController from "../controllers/property.controller";
import PropertDocumentRouter from "./propertydoc"
import ApartmentRouter from "./appartment";
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
        this.router.use("/docs", PropertDocumentRouter);
        this.router.use("/apartments", ApartmentRouter);
        this.router.get('/property', PropertyController.getProperty)
        this.router.get('/property/landlord/:landlordId', PropertyController.getPropertyListedByLandlord)
        this.router.post('/property/likes/:propertyId', this.authenticateService.authorize, PropertyController.createLikeProperty)
        this.router.get('/property/user/likes', this.authenticateService.authorize, PropertyController.getLikePropertyHistories)
        this.router.get('/property/:id', PropertyController.getPropertyById)
        this.router.get('/property/state', PropertyController.getPropertyByState)
        this.router.get('/property/listing', PropertyController.getListedProperties)
        this.router.get('/property/maintenance/:propertyId', PropertyController.getPropsMaintenance)
        this.router.get('/property/vendors/:propertyId', PropertyController.getVendorsServicesOnProps)
        this.router.post("/property/viewings",  this.authenticateService.authorize, PropertyController.createViewing);
        this.router.get("/property/viewings/:propertyId",  this.authenticateService.authorize, PropertyController.getAllPropsViewings);
        this.router.get("/property/view/:id",  this.authenticateService.authorize, PropertyController.getViewingById);
        this.router.patch("/property/viewings/:id",  this.authenticateService.authorize, PropertyController.updateViewing);
        this.router.patch("/property/view/:propertyId",  this.authenticateService.authorize, PropertyController.viewProperty);
        this.router.delete("/viewings/:id",  this.authenticateService.authorize, PropertyController.deleteViewing);
    }
}

export default new PropertyRouter().router
