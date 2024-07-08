import { Router } from "express";
import ProfileControls from '../controllers/profile';
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import { upload } from "../configs/multer";


class ProfileRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.patch('/:id', upload.array('images', 5), uploadToCloudinary, ProfileControls.profileUpdate);
    }
}

export default new ProfileRoutes().router;
