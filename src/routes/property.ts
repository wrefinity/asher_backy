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
        this.router.get('/property/:id', PropertyController.getPropertyById)
        this.router.get('/property/state', PropertyController.getPropertyByState)
        this.router.get('/property/listing', PropertyController.getListedProperties)
        this.router.get('/property/maintenance/:propertyId', PropertyController.getPropsMaintenance)
        this.router.get('/property/vendors/:propertyId', PropertyController.getVendorsServicesOnProps)
        
    }
}

export default new PropertyRouter().router