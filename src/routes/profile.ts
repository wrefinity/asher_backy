import { Router } from "express";
import ProfileControls from '../controllers/profile';
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
import { Authorize } from "../middlewares/authorize";

class ProfileRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.patch('/:profileId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ProfileControls.profileUpdate);
    }
}

export default new ProfileRoutes().router;
