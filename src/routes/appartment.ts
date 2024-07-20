import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";
import AppartmentController from "../controllers/apartment.controller";

class ApartmentRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post('/:propertyId', this.authenticateService.authorize, upload.array('files'),  uploadToCloudinary, AppartmentController.createApartment)
        this.router.get('/:propertyId', AppartmentController.getAppartments);
    }
}

export default new ApartmentRouter().router