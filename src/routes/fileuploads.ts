import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import FileUploadController from "../controllers/file_upload.controller";
import upload from "../configs/multer";
import { uploadToCloudinary } from "../middlewares/multerCloudinary";


class UploadsRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post(
            '/',
            upload.array('files'),
            uploadToCloudinary,
            FileUploadController.uploadToCloudinary
        )
        this.router.post(
            '/single',
            upload.array('files'),
            uploadToCloudinary,
            FileUploadController.uploadAppDocumentsWithProps
        )
    }
}

export default new UploadsRouter().router