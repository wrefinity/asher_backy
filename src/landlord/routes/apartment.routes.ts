import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import AppartmentController from "../controllers/apartment.controller";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";

class ApartmentLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {

        this.router.get('/', AppartmentController.getCurrentLandlordAppartments)
        this.router.post('/', upload.array('files'), uploadToCloudinary, AppartmentController.createApartment)
        this.router.patch('/:apartmentId', upload.array('files'), uploadToCloudinary, AppartmentController.updateApartment)
        this.router.delete('/:apartmentId', AppartmentController.deleteApartments)
        
    }
}

export default new ApartmentLandlordRouter().router