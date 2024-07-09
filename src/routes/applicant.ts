import { Router } from "express";
import ApplicantControls from '../webuser/controllers/applicant';
import { Authorize } from "../middlewares/authorize";
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload from "../configs/multer";
class ApplicantRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ApplicantControls.createApplicant);
        this.router.get('/:id', ApplicantControls.getApplicant);
        this.router.put('/:id', ApplicantControls.updateApplicant);
        this.router.delete('/:id', ApplicantControls.deleteApplicant);
    }
}

export default new ApplicantRoutes().router;
