import { Router } from "express";
import ApplicantControls from '../webuser/controllers/applicant';
import LandlordReferenceFormControls from '../controllers/landlord.referenceform.controller';
import GuarantorReferenceFormControls from '../controllers/guarantor.referenceform.controller';
import EmployeeReferenceFormControls from '../controllers/employee.reference.controller';
import { Authorize } from "../middlewares/authorize";
import { uploadToCloudinary } from '../middlewares/multerCloudinary';
import upload, {uploadControl} from "../configs/multer";
import { validateBody } from "../middlewares/validation";
import { employmentInformationSchema } from "../webuser/schemas";

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
        this.router.get('/applicant/stats', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  ApplicantControls.getBasicStats);
        this.router.get('/invities/all', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  ApplicantControls.getInvites);
        this.router.get('/invities/:id/get', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  ApplicantControls.getInvite);
        this.router.patch('/invites/update/:id', ApplicantControls.updateInvite);
        this.router.patch('/move-in-date/:id', ApplicantControls.updateMoveInDate);

        this.router.post('/:propertiesId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateApplicantBioData);
        this.router.get('/application-fees/:propertyId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.getPropertyApplicationFee);
        this.router.get('/milestones/:propertyId/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.getApplicationPropsMilestone);
        this.router.get('/pending', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.getPendingApplications);
        this.router.get('/all', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.getApplications);
        this.router.post('/complete/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.completeApplication);
        this.router.post('/guarantor/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateGuarantor);
        this.router.post('/emergency-contact/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateEmergencyContact);
        this.router.post('/employer-info/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), validateBody(employmentInformationSchema), ApplicantControls.createOrUpdateEmploymentInformation);
        this.router.post('/residential-info/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateResidentialInformation);
        this.router.post('/additional-info/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateAdditionInfo);
        this.router.post('/referees/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateRefree);
        // this.router.post('/document/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), upload.array('files'), uploadToCloudinary, ApplicantControls.createApplicantionDocument);
        this.router.post('/document/:applicationId', upload.array('files'), this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.uploadAppDocuments);
        this.router.post('/declaration/:applicationId', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.createOrUpdateDeclaration);

        this.router.get('/:id', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  ApplicantControls.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  ApplicantControls.deleteApplicant);
        
        // application reference for landlord and guarantor
        this.router.post('/landlord-reference/:id', LandlordReferenceFormControls.createReferenceForm);
        this.router.post('/landlord-nomination/:id/accept', LandlordReferenceFormControls.acceptNomination);
        this.router.post('/landlord-nomination/:id/decline', LandlordReferenceFormControls.declineNomination);
        this.router.post('/guarantor-reference/:id', GuarantorReferenceFormControls.createGuarantorAgreement);
        this.router.post('/guarantor-nomination/:id/accept', GuarantorReferenceFormControls.acceptNomination);
        this.router.post('/guarantor-nomination/:id/decline', GuarantorReferenceFormControls.declineNomination);
        this.router.post('/employee-reference/:id', EmployeeReferenceFormControls.createEmployeeReference);
        this.router.post('/employer-nomination/:id/accept', EmployeeReferenceFormControls.acceptNomination);
        this.router.post('/employer-nomination/:id/decline', EmployeeReferenceFormControls.declineNomination);
        this.router.get('/references/:id', LandlordReferenceFormControls.getReferenceForm);
        this.router.post('/sign/:id', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(),  upload.array('files'), uploadToCloudinary, ApplicantControls.signAgreementForm); 
        this.router.get('/last-application/user', this.authenticateService.authorize, this.authenticateService.requireWebUserPortalRole(), ApplicantControls.getLastApplicationDataForUser);}
}

export default new ApplicantRoutes().router;