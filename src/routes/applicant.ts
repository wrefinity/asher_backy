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
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/:propertiesId', this.authenticateService.authorize, ApplicantControls.createOrUpdateApplicantBioData);
        this.router.post('/complete/:applicationId', this.authenticateService.authorize, ApplicantControls.completeApplication);
        this.router.post('/guarantor/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateGuarantor);
        this.router.post('/emergency-contact/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateEmergencyContact);
        this.router.post('/employer-info/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateEmploymentInformation);
        this.router.post('/residential-info/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateResidentialInformation);
        this.router.post('/document/:applicationId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ApplicantControls.createApplicantionDocument);

        this.router.get('/:id', this.authenticateService.authorize,  ApplicantControls.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize,  ApplicantControls.deleteApplicant);
    }
}

export default new ApplicantRoutes().router;