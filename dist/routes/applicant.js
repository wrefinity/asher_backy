"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicant_1 = __importDefault(require("../webuser/controllers/applicant"));
const landlord_referenceform_controller_1 = __importDefault(require("../controllers/landlord.referenceform.controller"));
const guarantor_referenceform_controller_1 = __importDefault(require("../controllers/guarantor.referenceform.controller"));
const employee_reference_controller_1 = __importDefault(require("../controllers/employee.reference.controller"));
const authorize_1 = require("../middlewares/authorize");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const multer_1 = __importDefault(require("../configs/multer"));
class ApplicantRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/applicant/stats', this.authenticateService.authorize, applicant_1.default.getBasicStats);
        this.router.get('/invities/all', this.authenticateService.authorize, applicant_1.default.getInvites);
        this.router.get('/invities/:id/get', this.authenticateService.authorize, applicant_1.default.getInvite);
        this.router.patch('/invites/update/:id', applicant_1.default.updateInvite);
        this.router.post('/:propertiesId', this.authenticateService.authorize, applicant_1.default.createOrUpdateApplicantBioData);
        this.router.get('/application-fees/:propertyId', this.authenticateService.authorize, applicant_1.default.getPropertyApplicationFee);
        this.router.get('/milestones/:propertyId/:applicationId', this.authenticateService.authorize, applicant_1.default.getApplicationPropsMilestone);
        this.router.get('/pending', this.authenticateService.authorize, applicant_1.default.getPendingApplications);
        this.router.get('/all', this.authenticateService.authorize, applicant_1.default.getApplications);
        this.router.post('/complete/:applicationId', this.authenticateService.authorize, applicant_1.default.completeApplication);
        this.router.post('/guarantor/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateGuarantor);
        this.router.post('/emergency-contact/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateEmergencyContact);
        this.router.post('/employer-info/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateEmploymentInformation);
        this.router.post('/residential-info/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateResidentialInformation);
        this.router.post('/additional-info/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateAdditionInfo);
        this.router.post('/referees/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateRefree);
        // this.router.post('/document/:applicationId', this.authenticateService.authorize, upload.array('files'), uploadToCloudinary, ApplicantControls.createApplicantionDocument);
        this.router.post('/document/:applicationId', multer_1.default.array('files'), this.authenticateService.authorize, applicant_1.default.uploadAppDocuments);
        this.router.post('/declaration/:applicationId', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, applicant_1.default.createOrUpdateDeclaration);
        this.router.get('/:id', this.authenticateService.authorize, applicant_1.default.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize, applicant_1.default.deleteApplicant);
        // application reference for landlord and guarantor
        this.router.post('/landlord-reference/:id', landlord_referenceform_controller_1.default.createReferenceForm);
        this.router.post('/guarantor-reference/:id', guarantor_referenceform_controller_1.default.createGuarantorAgreement);
        this.router.post('/employee-reference/:id', employee_reference_controller_1.default.createEmployeeReference);
        this.router.get('/references/:id', landlord_referenceform_controller_1.default.getReferenceForm);
        this.router.post('/sign/:id', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, applicant_1.default.signAgreementForm);
    }
}
exports.default = new ApplicantRoutes().router;
