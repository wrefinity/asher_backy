"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const applicantService_1 = __importDefault(require("../services/applicantService"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
const multerCloudinary_1 = require("../../middlewares/multerCloudinary");
const schemas_1 = require("../schemas");
const error_service_1 = __importDefault(require("../../services/error.service"));
const client_1 = require("@prisma/client");
const logs_services_1 = __importDefault(require("../../services/logs.services"));
const applicationInvitesSchema_1 = require("../../landlord/validations/schema/applicationInvitesSchema");
class ApplicantControls {
    constructor() {
        this.getPendingApplications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(403).json({ error: 'kindly login as applicant' });
                }
                const pendingApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.PENDING);
                res.status(200).json({ pendingApplications });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getApplications = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(403).json({ error: 'kindly login as applicant' });
                }
                const pendingApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.PENDING);
                const completedApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.COMPLETED);
                const declinedApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.DECLINED);
                const makePaymentApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.MAKEPAYMENT);
                const acceptedApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.ACCEPTED);
                const submittedApplications = yield applicantService_1.default.getApplicationBasedOnStatus(userId, client_1.ApplicationStatus.SUBMITTED);
                const invites = yield applicantService_1.default.getInvite({ userInvitedId: userId });
                // Define status groups
                const activeStatuses = [
                    client_1.ApplicationStatus.PENDING,
                    client_1.ApplicationStatus.SUBMITTED,
                    client_1.ApplicationStatus.MAKEPAYMENT,
                    client_1.ApplicationStatus.ACCEPTED
                ];
                const completedStatuses = [
                    client_1.ApplicationStatus.COMPLETED,
                    client_1.ApplicationStatus.DECLINED
                ];
                // Get grouped applications
                const [activeApps, completedApps] = yield Promise.all([
                    applicantService_1.default.getApplicationBasedOnStatus(userId, activeStatuses),
                    applicantService_1.default.getApplicationBasedOnStatus(userId, completedStatuses)
                ]);
                res.status(200).json({
                    applications: {
                        pendingApplications,
                        completedApplications,
                        declinedApplications,
                        makePaymentApplications,
                        acceptedApplications,
                        submittedApplications,
                        activeApps,
                        completedApps,
                        invites
                    }
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        /**
         * Fetches application property milestones and application details.
         * @param req - Express request object.
         * @param res - Express response object.
        */
        this.getApplicationPropsMilestone = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { propertyId, applicationId } = req.params;
                // Validate user ID
                if (!userId) {
                    return res.status(403).json({ error: 'Kindly login as an applicant.' });
                }
                // Validate propertyId
                if (!propertyId) {
                    return res.status(400).json({ error: 'Property ID is required.' });
                }
                // Fetch property milestones
                const propsMilestone = yield logs_services_1.default.getMilestone(userId, client_1.LogType.APPLICATION, propertyId);
                let application = null;
                let milestones = propsMilestone;
                // Fetch application milestones if applicationId is provided
                if (applicationId) {
                    // Validate applicationId
                    if (!applicationId) {
                        return res.status(400).json({ error: 'Application ID is required.' });
                    }
                    // Fetch application details
                    application = yield applicantService_1.default.getApplicationById(applicationId);
                    // Fetch application-specific milestones
                    const applicationMilestone = yield logs_services_1.default.getMilestone(userId, client_1.LogType.APPLICATION, propertyId, applicationId);
                    // Combine property and application milestones
                    milestones = [...propsMilestone, ...applicationMilestone];
                }
                // Return the response
                res.status(200).json({ milestones, application });
            }
            catch (error) {
                // Handle errors
                error_service_1.default.handleError(error, res);
            }
        });
        this.getPropertyApplicationFee = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { propertyId } = req.params;
                // Validate propertyId
                if (!propertyId) {
                    return res.status(500).json({ error: 'Property ID is required.' });
                }
                console.log(req.params);
                // Check if property exists
                const property = yield propertyServices_1.default.getPropertiesById(propertyId);
                if (!property) {
                    return res.status(404).json({ error: 'Property does not exist.' });
                }
                const { landlordId, rentalFee } = property;
                // Validate landlord ID and rental fee
                if (!landlordId || !rentalFee) {
                    return res.status(400).json({ error: 'Invalid property data.' });
                }
                // Fetch global settings for application fees
                const propsSettings = yield propertyServices_1.default.getPropertyGlobalFees(landlordId, client_1.PropsSettingType.APPLICATION);
                // Validate propsSettings
                if (!propsSettings || !propsSettings.applicationFee) {
                    return res.status(400).json({ error: 'Application fee settings not found.' });
                }
                // Calculate application fee
                const applicationFee = Number(rentalFee) * Number(propsSettings.applicationFee);
                return res.status(200).json({
                    property,
                    applicationFee,
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.completeApplication = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.applicationId;
                if (!applicationId) {
                    return res.status(400).json({ error: 'Application ID is required' });
                }
                // check for the existance of application before proceeding
                const applicationExist = yield applicantService_1.default.getApplicationById(applicationId);
                if (!applicationExist)
                    return res.status(500).json({ message: "Application Doesn't Exist" });
                const application = yield applicantService_1.default.updateApplicationStatus(applicationId, client_1.ApplicationStatus.COMPLETED);
                res.status(200).json(application);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // done
        // creating an application 
        this.createOrUpdateApplicantBioData = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = String(req.user.id);
                const propertiesId = req.params.propertiesId;
                // check for property existance
                const propertyExist = yield propertyServices_1.default.getPropertiesById(propertiesId);
                if (!propertyExist)
                    return res.status(404).json({ message: `property with the id : ${propertiesId} doesn't exist` });
                const { error, value } = schemas_1.applicantPersonalDetailsSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const application = yield applicantService_1.default.createApplication(Object.assign(Object.assign({}, value), { userId }), propertiesId, userId);
                return res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createOrUpdateAdditionInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = String(req.user.id);
                const applicationId = req.params.applicationId;
                const { error, value } = schemas_1.additionalInfoSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const application = yield applicantService_1.default.createOrUpdateAdditionalInformation(Object.assign(Object.assign({}, value), { applicationId }));
                return res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        //done
        this.createOrUpdateGuarantor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user.id;
                const applicationId = req.params.applicationId;
                const { error } = schemas_1.guarantorInformationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const application = yield applicantService_1.default.createOrUpdateGuarantor(Object.assign(Object.assign({}, req.body), { applicationId, userId }));
                return res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // done
        this.createOrUpdateEmergencyContact = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.applicationId;
                const userId = req.user.id;
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const { error, value } = schemas_1.emergencyContactSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const application = yield applicantService_1.default.createOrUpdateEmergencyContact(Object.assign(Object.assign({}, value), { userId, applicationId }));
                return res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // done
        this.createOrUpdateRefree = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.applicationId;
                const userId = req.user.id;
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const { error, value } = schemas_1.refreeSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const referee = yield applicantService_1.default.createOrUpdateReferees(Object.assign(Object.assign({}, value), { applicationId, userId }));
                return res.status(201).json({ referee });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // Upload Documents Handler
        this.uploadAppDocuments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.applicationId;
                const userId = req.user.id;
                console.log("Received files:", req.files);
                // Ensure `req.files` exists and is not empty
                if (!req.files || Object.keys(req.files).length === 0) {
                    return res.status(400).json({ error: "No files provided" });
                }
                // Convert `req.files` to an array
                const files = Object.values(req.files).flat();
                // Validate application existence
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "Invalid application ID provided" });
                }
                // Validate application completion
                const isCompleted = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompleted) {
                    return res.status(400).json({ error: "Application is already completed" });
                }
                // Upload files and save metadata
                const uploadedFiles = yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
                    const uploadResult = yield (0, multerCloudinary_1.uploadDocsCloudinary)(file);
                    // Ensure `documentUrl` is always available
                    if (!uploadResult.secure_url) {
                        throw new Error("Failed to upload document");
                    }
                    // Remove file extension (e.g., ".jpg", ".pdf")
                    const documentName = file.originalname.replace(/\.[^/.]+$/, "");
                    return yield applicantService_1.default.createOrUpdateApplicationDoc({
                        documentName, // File name
                        type: file.mimetype, // MIME type (e.g., image/jpeg, application/pdf)
                        size: String(file.size), // File size in bytes
                        applicationId,
                        documentUrl: uploadResult.secure_url
                    });
                })));
                return res.status(201).json({ success: true, uploadedFiles });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createApplicantionDocument = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = schemas_1.documentSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const applicationId = req.params.applicationId;
                const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls } = value;
                // Check if all three URLs are empty
                if (!cloudinaryUrls && !cloudinaryVideoUrls && !cloudinaryDocumentUrls) {
                    // Prompt the user for the document URL if all are empty
                    return res.status(400).json({
                        message: "Please provide a document URL. Either cloudinaryUrls, cloudinaryVideoUrls, cloudinaryAudioUrls, or cloudinaryDocumentUrls must be supplied."
                    });
                }
                // Proceed with the rest of your logic
                const documentUrl = cloudinaryUrls || cloudinaryVideoUrls || cloudinaryDocumentUrls;
                delete value['cloudinaryUrls'];
                delete value['cloudinaryVideoUrls'];
                delete value['cloudinaryDocumentUrls'];
                delete value['cloudinaryAudioUrls'];
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const application = yield applicantService_1.default.createOrUpdateApplicationDoc(Object.assign(Object.assign({}, value), { documentUrl: documentUrl[0], applicationId }));
                return res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // 
        this.createOrUpdateDeclaration = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = schemas_1.declarationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const applicationId = req.params.applicationId;
                const { cloudinaryUrls } = value;
                // Check if all three URLs are empty
                if (!cloudinaryUrls) {
                    return res.status(400).json({
                        message: "kindly sign the document"
                    });
                }
                const signature = cloudinaryUrls[0];
                delete value['cloudinaryUrls'];
                delete value['cloudinaryVideoUrls'];
                delete value['cloudinaryDocumentUrls'];
                delete value['cloudinaryAudioUrls'];
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const declaration = yield applicantService_1.default.createOrUpdateDeclaration(Object.assign(Object.assign({}, value), { signature, applicationId }));
                return res.status(201).json({ declaration });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // done
        this.createOrUpdateResidentialInformation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = schemas_1.residentialInformationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const applicationId = req.params.applicationId;
                const userId = req.user.id;
                const data = req.body;
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompletd = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompletd) {
                    return res.status(400).json({ error: "application completed" });
                }
                const result = yield applicantService_1.default.createOrUpdateResidentialInformation(Object.assign(Object.assign({}, data), { applicationId, userId }));
                res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // done
        this.createOrUpdateEmploymentInformation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate request body
                const { error } = schemas_1.employmentInformationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const applicationId = req.params.applicationId;
                const userId = req.user.id;
                const data = req.body;
                const existingApplication = yield applicantService_1.default.checkApplicationExistance(applicationId);
                if (!existingApplication) {
                    return res.status(400).json({ error: "wrong application id supplied" });
                }
                const isCompleted = yield applicantService_1.default.checkApplicationCompleted(applicationId);
                if (isCompleted) {
                    return res.status(400).json({ error: "application completed" });
                }
                const employmentInformation = yield applicantService_1.default.createOrUpdateEmploymentInformation(Object.assign(Object.assign({}, data), { applicationId, userId }));
                return res.status(200).json(employmentInformation);
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.getApplication = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const application = yield applicantService_1.default.getApplicationById(id);
                if (!application) {
                    return res.status(404).json({ error: 'Application not found' });
                }
                return res.status(200).json({ application });
            }
            catch (err) {
                error_service_1.default.handleError(err, res);
            }
        });
        this.deleteApplicant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const applicant = yield applicantService_1.default.deleteApplicant(id);
                return res.status(200).json({ applicant });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getInvites = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userInvitedId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const pendingInvites = yield applicantService_1.default.getInvite({ userInvitedId, response: client_1.InvitedResponse.PENDING });
                const acceptInvites = yield applicantService_1.default.getInvite({ userInvitedId, response: client_1.InvitedResponse.ACCEPTED });
                const rescheduledInvites = yield applicantService_1.default.getInvite({ userInvitedId, response: client_1.InvitedResponse.RESCHEDULED });
                const rejectedInvites = yield applicantService_1.default.getInvite({ userInvitedId, response: client_1.InvitedResponse.REJECTED });
                // const invite = await ApplicantService.getInvite({ userInvitedId });
                // if (!invite) return res.status(404).json({ message: 'Invite not found' });
                return res.status(200).json({ invites: {
                        pendingInvites,
                        acceptInvites,
                        rescheduledInvites,
                        rejectedInvites
                    } });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateInvite = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const inviteExist = yield applicantService_1.default.getInvitedById(id);
                if (!inviteExist)
                    return res.status(404).json({ message: "invitation doesn't exist" });
                const { error, value } = applicationInvitesSchema_1.updateApplicationInviteSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const invite = yield applicantService_1.default.updateInvites(id, value);
                return res.status(200).json({ invite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new ApplicantControls();
