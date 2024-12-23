"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicant_1 = __importDefault(require("../webuser/controllers/applicant"));
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
        this.router.post('/:propertiesId', this.authenticateService.authorize, applicant_1.default.createOrUpdateApplicantBioData);
        this.router.get('/application-fees/:propertyId', this.authenticateService.authorize, applicant_1.default.getPropertyApplicationFee);
        this.router.get('/pending', this.authenticateService.authorize, applicant_1.default.getPendingApplications);
        this.router.post('/complete/:applicationId', this.authenticateService.authorize, applicant_1.default.completeApplication);
        this.router.post('/guarantor/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateGuarantor);
        this.router.post('/emergency-contact/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateEmergencyContact);
        this.router.post('/employer-info/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateEmploymentInformation);
        this.router.post('/residential-info/:applicationId', this.authenticateService.authorize, applicant_1.default.createOrUpdateResidentialInformation);
        this.router.post('/document/:applicationId', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, applicant_1.default.createApplicantionDocument);
        this.router.get('/:id', this.authenticateService.authorize, applicant_1.default.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize, applicant_1.default.deleteApplicant);
    }
}
exports.default = new ApplicantRoutes().router;
