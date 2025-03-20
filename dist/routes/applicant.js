"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicant_1 = __importDefault(require("../webuser/controllers/applicant"));
const authorize_1 = require("../middlewares/authorize");
const multerCloudinary_1 = require("../middlewares/multerCloudinary");
const multer_1 = __importStar(require("../configs/multer"));
class ApplicantRoutes {
    constructor() {
        this.router = (0, express_1.Router)();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/invities/all', this.authenticateService.authorize, applicant_1.default.getInvites);
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
        this.router.post('/document/:applicationId', multer_1.uploadControl.array("files"), this.authenticateService.authorize, applicant_1.default.uploadAppDocuments);
        this.router.post('/declaration/:applicationId', this.authenticateService.authorize, multer_1.default.array('files'), multerCloudinary_1.uploadToCloudinary, applicant_1.default.createOrUpdateDeclaration);
        this.router.get('/:id', this.authenticateService.authorize, applicant_1.default.getApplication);
        this.router.delete('/:id', this.authenticateService.authorize, applicant_1.default.deleteApplicant);
    }
}
exports.default = new ApplicantRoutes().router;
