import { Router } from "express";
import ProfileControls from '../controllers/profile';
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
import { Authorize } from "../middlewares/authorize";
import { validateBody } from "../middlewares/validation";
import { profileSchema, userSearchPreferenceSchema } from "../validations/schemas/profile";

class ProfileRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize()
        this.router.use(this.authenticateService.authorize)
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/update', upload.array('files'), uploadToCloudinary, validateBody(profileSchema), ProfileControls.profileUpdate)
        this.router.post('/search-preferences', validateBody(userSearchPreferenceSchema), ProfileControls.addUserSearchPreference);;
        this.router.get('/', ProfileControls.getCurrentUserProfile);
    }
}

export default new ProfileRoutes().router;
