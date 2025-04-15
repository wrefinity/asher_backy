import { Router } from "express";
import ApplicantControls from '../webuser/controllers/applicant';
import LandlordReferenceFormControls from '../controllers/landlord.referenceform.controller';
import GuarantorReferenceFormControls from '../controllers/guarantor.referenceform.controller';
import EmployeeReferenceFormControls from '../controllers/employee.reference.controller';
import { Authorize } from "../middlewares/authorize";
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload, {uploadControl} from "../configs/multer";
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
        this.router.get('/applicant/stats', this.authenticateService.authorize,  ApplicantControls.getBasicStats);
        this.router.get('/invities/all', this.authenticateService.authorize,  ApplicantControls.getInvites);
        this.router.get('/invities/:id/get', this.authenticateService.authorize,  ApplicantControls.getInvite);
        this.router.patch('/invites/update/:id', ApplicantControls.updateInvite);

        this.router.post('/:propertiesId', this.authenticateService.authorize, ApplicantControls.createOrUpdateApplicantBioData);
        this.router.get('/application-fees/:propertyId', this.authenticateService.authorize, ApplicantControls.getPropertyApplicationFee);
        this.router.get('/milestones/:propertyId/:applicationId', this.authenticateService.authorize, ApplicantControls.getApplicationPropsMilestone);
        this.router.get('/pending', this.authenticateService.authorize, ApplicantControls.getPendingApplications);
        this.router.get('/all', this.authenticateService.authorize, ApplicantControls.getApplications);
        this.router.post('/complete/:applicationId', this.authenticateService.authorize, ApplicantControls.completeApplication);
        this.router.post('/guarantor/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateGuarantor);
        this.router.post('/emergency-contact/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateEmergencyContact);
        this.router.post('/employer-info/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateEmploymentInformation);
        this.router.post('/residential-info/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateResidentialInformation);
        this.router.post('/additional-info/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateAdditionInfo);
        this.router.post('/referees/:applicationId', this.authenticateService.authorize, ApplicantControls.createOrUpdateRefree);
        // this.router.post('/document/:applicationId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ApplicantControls.createApplicantionDocument);
        this.router.post('/document/:applicationId', upload.array('files'), this.authenticateService.authorize, ApplicantControls.uploadAppDocuments);
        this.router.post('/declaration/:applicationId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ApplicantControls.createOrUpdateDeclaration);

        this.router.get('/:id', this.authenticateService.authorize,  ApplicantControls.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize,  ApplicantControls.deleteApplicant);
        
        // application reference for landlord and guarantor
        this.router.post('/landlord-reference/:id', LandlordReferenceFormControls.createReferenceForm);
        this.router.post('/guarantor-reference/:id', GuarantorReferenceFormControls.createGuarantorAgreement);
        this.router.post('/employee-reference/:id', EmployeeReferenceFormControls.createEmployeeReference);
        this.router.get('/references/:id', LandlordReferenceFormControls.getReferenceForm);
        this.router.post('/sign/:id', this.authenticateService.authorize,  upload.array('files'), uploadToCloudinary, ApplicantControls.signAgreementForm);
    }
}

export default new ApplicantRoutes().router;
