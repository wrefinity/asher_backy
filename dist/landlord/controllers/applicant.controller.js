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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const error_service_1 = __importDefault(require("../../services/error.service"));
const applicantService_1 = __importDefault(require("../../webuser/services/applicantService"));
const application_services_1 = __importDefault(require("../../services/application.services"));
const landlord_service_1 = require("../services/landlord.service");
const tenant_service_1 = __importDefault(require("../../services/tenant.service"));
const client_2 = require("@prisma/client");
const applicationInvitesSchema_1 = require("../validations/schema/applicationInvitesSchema");
const emailer_1 = __importDefault(require("../../utils/emailer"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
const logs_services_1 = __importDefault(require("../../services/logs.services"));
const user_services_1 = __importDefault(require("../../services/user.services"));
const emailer_2 = __importDefault(require("../../utils/emailer"));
const applicantService_2 = __importDefault(require("../../webuser/services/applicantService"));
const propertyDocument_service_1 = require("../../services/propertyDocument.service");
const emailService_1 = __importDefault(require("../../services/emailService"));
class ApplicationControls {
    constructor() {
        this.getApplicationStatistics = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const applicationStatistics = yield applicantService_1.default.countApplicationStatsForLandlord(landlordId);
                res.status(200).json({ applicationStatistics });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // get  applications base on the three most
        // essentially step during invites stage 
        this.getApplicationsWithInvites = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.user.landlords.id;
                const completedStatuses = [
                    client_1.InvitedResponse.PENDING,
                    client_1.InvitedResponse.FEEDBACK,
                    client_1.InvitedResponse.APPLY,
                ];
                const application = yield application_services_1.default.getInvitesWithStatus(landlordId, completedStatuses);
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // getApplicationsWithInvites = async (req: CustomRequest, res: Response) => {
        //     try {
        //         const landlordId = req.user.landlords.id;
        //         const completedStatuses = [
        //             InvitedResponse.PENDING,
        //             InvitedResponse.ACCEPTED,
        //             InvitedResponse.SCHEDULED,
        //             InvitedResponse.FEEDBACK,
        //             InvitedResponse.APPLY,
        //             // InvitedResponse.REJECTED,
        //             // InvitedResponse.APPLICATION_NOT_STARTED,
        //             // InvitedResponse.APPLICATION_STARTED,
        //             // InvitedResponse.VISITED,
        //             // InvitedResponse.NOT_VISITED,
        //         ];
        //         const application = await ApplicationInvitesService.getInvitesWithStatus(landlordId, completedStatuses);
        //         return res.status(200).json({ application });
        //     } catch (error) {
        //         errorService.handleError(error, res)
        //     }
        // }
        this.getApplicationsPending = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const application = yield applicantService_1.default.getApplicationsForLandlordWithStatus(landlordId, client_2.ApplicationStatus.PENDING);
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getApplicationsCompleted = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const application = yield applicantService_1.default.getApplicationsForLandlordWithStatus(landlordId, client_2.ApplicationStatus.COMPLETED);
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTotalApplication = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const application = yield applicantService_1.default.getApplicationsForLandlordWithStatus(landlordId);
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.makeApplicationPaymentRequest = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const applicationId = (_a = req.params) === null || _a === void 0 ? void 0 : _a.applicationId;
                const application = yield applicantService_1.default.updateApplicationStatus(applicationId, client_2.ApplicationStatus.MAKEPAYMENT);
                if (!application)
                    return res.status(400).json({ message: "application doesn't exist" });
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.declineApplication = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const applicationId = (_a = req.params) === null || _a === void 0 ? void 0 : _a.applicationId;
                const application = yield applicantService_1.default.updateApplicationStatus(applicationId, client_2.ApplicationStatus.DECLINED);
                if (!application)
                    return res.status(400).json({ message: "property doesn't exist" });
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.approveApplicationAndCreateTenant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const applicationId = (_c = req.params) === null || _c === void 0 ? void 0 : _c.applicationId;
                // if (!req.body.email) return res.status(400).json({ message: "kindly supply the new tenant email" })
                const application = yield applicantService_1.default.getApplicationById(applicationId);
                // get the tenant web user email 
                if (!application)
                    return res.status(400).json({ message: "application doesn't exist" });
                // update application invite status to approve
                yield application_services_1.default.updateInvite(application.applicationInviteId, { response: client_1.InvitedResponse.APPROVED });
                // update the application also to completed
                const tenantWebUserEmail = application === null || application === void 0 ? void 0 : application.user.email;
                const userEmail = tenantWebUserEmail.toString().split('@')[0];
                // get the current landlord email domain
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord)
                    return res.status(403).json({ message: "login as a landlord" });
                const landlordEmail = landlord.user.email.toString().trim().split('@')[0];
                const email = `${userEmail}@${landlordEmail}.asher.co`;
                // TODO: check if tenant has been a tenant for the current landlord before and just update the property
                const tenant = yield yield user_services_1.default.createUser(Object.assign(Object.assign({}, req.body), { newEmail: email, email: tenantWebUserEmail, tenantWebUserEmail, propertyId: application.propertiesId, applicationId, role: client_1.userRoles.TENANT, password: (_d = application === null || application === void 0 ? void 0 : application.personalDetails) === null || _d === void 0 ? void 0 : _d.firstName, landlordId }), false, (_e = req.user) === null || _e === void 0 ? void 0 : _e.id, true);
                if (!tenant)
                    return res.status(400).json({ message: "tenant not created" });
                yield applicantService_2.default.updateApplicationStatusStep(applicationId, client_2.ApplicationStatus.TENANT_CREATED);
                return res.status(200).json({ tenant });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createInvite = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const enquiryId = (_a = req.params) === null || _a === void 0 ? void 0 : _a.enquiryId;
                // check enquiryId,
                const enquire = yield logs_services_1.default.getLogsById(enquiryId);
                if (!enquire) {
                    return res.status(400).json({ message: "invalid enquire id" });
                }
                const { error, value } = applicationInvitesSchema_1.createApplicationInviteSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const invitedByLandordId = (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.landlords) === null || _c === void 0 ? void 0 : _c.id;
                const invite = yield application_services_1.default.createInvite(Object.assign(Object.assign({}, value), { invitedByLandordId,
                    enquiryId, responseStepsCompleted: value.response ? [value.response] : [client_1.InvitedResponse.PENDING] }));
                const propertyId = value.propertyId;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const userExist = yield user_services_1.default.getUserById(value.userInvitedId);
                if (!userExist) {
                    return res.status(404).json({ message: 'user not found' });
                }
                // TODO:
                // send message to the tenants
                const tenantInfor = yield tenant_service_1.default.getUserInfoByTenantId(value.tenantId);
                const htmlContent = `
                <h2>Invitation for Property Viewing</h2>
                <p>Hello,</p>
                <p>You have been invited to a property viewing. Here are the details:</p>
                <ul>
                <li><strong>Scheduled Date:</strong> ${(value === null || value === void 0 ? void 0 : value.scheduleDate) ? value === null || value === void 0 ? void 0 : value.scheduleDate : "To be determined"}</li>
                <li><strong>Status:</strong> PENDING</li>
                </ul>
                <p>Please respond to this invitation as soon as possible.</p>
            `;
                yield (0, emailer_1.default)(tenantInfor.email, "Asher Rentals Invites", htmlContent);
                yield logs_services_1.default.updateLog(enquiryId, { status: client_1.logTypeStatus.INVITED });
                return res.status(201).json({ invite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createInviteForExistingUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { error, value } = applicationInvitesSchema_1.createApplicationInviteSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const invitedByLandordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const propertyId = value.propertyId;
                const property = yield propertyServices_1.default.getPropertyById(propertyId);
                if (!property) {
                    return res.status(404).json({ message: 'Property not found' });
                }
                const userExist = yield user_services_1.default.getUserById(value.userInvitedId);
                if (!userExist) {
                    return res.status(404).json({ message: 'user not found' });
                }
                const enquire = yield logs_services_1.default.createLog({ status: client_1.logTypeStatus.INVITED, type: client_2.LogType.APPLICATION, events: "Application Invites", createdById: userExist === null || userExist === void 0 ? void 0 : userExist.id });
                const invite = yield application_services_1.default.createInvite(Object.assign(Object.assign({}, value), { invitedByLandordId, userInvitedId: userExist === null || userExist === void 0 ? void 0 : userExist.id, enquiryId: enquire === null || enquire === void 0 ? void 0 : enquire.id, responseStepsCompleted: value.response ? [value.response] : [client_1.InvitedResponse.PENDING] }));
                // send message to the tenants
                const htmlContent = `
                <h2>Invitation for Property Viewing</h2>
                <p>Hello,</p>
                <p>You have been invited to a property viewing. Here are the details:</p>
                <ul>
                <li><strong>Scheduled Date:</strong> ${(value === null || value === void 0 ? void 0 : value.scheduleDate) ? value === null || value === void 0 ? void 0 : value.scheduleDate : "To be determined"}</li>
                <li><strong>Status:</strong> PENDING</li>
                </ul>
                <p>Please respond to this invitation as soon as possible.</p>
            `;
                yield (0, emailer_1.default)(userExist === null || userExist === void 0 ? void 0 : userExist.email, "Asher Rentals Invites", htmlContent);
                return res.status(201).json({ invite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getInvite = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const invite = yield application_services_1.default.getInviteById(id);
                if (!invite)
                    return res.status(404).json({ message: 'Invite not found' });
                return res.status(200).json({ invite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getInvites = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const invitedByLandordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                // get all invites which has not reach application state
                const invite = yield application_services_1.default.getInviteWithoutStatus(invitedByLandordId, [
                    client_1.InvitedResponse.APPLY,
                    client_1.InvitedResponse.FEEDBACK,
                    // InvitedResponse.SCHEDULED,
                    client_1.InvitedResponse.APPLICATION_STARTED,
                    client_1.InvitedResponse.APPLICATION_NOT_STARTED
                ]);
                if (!invite)
                    return res.status(404).json({ message: 'Invite not found' });
                return res.status(200).json({ invite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateInvite = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const invite = yield application_services_1.default.getInviteById(id);
                if (!invite) {
                    return res.status(404).json({ error: "No such application invite" });
                }
                // Validate request body
                const { error, value } = applicationInvitesSchema_1.updateApplicationInviteSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                if (value.response === client_1.InvitedResponse.APPLY) {
                    // Check if states has PENDING, SCHEDULED, and FEEDBACK steps are completed
                    const requiredSteps = [client_1.InvitedResponse.FEEDBACK, client_1.InvitedResponse.AWAITING_FEEDBACK, client_1.InvitedResponse.PENDING];
                    // Verify that all required steps are included in responseStepsCompleted
                    const hasAllRequiredSteps = requiredSteps.every(step => { var _a; return (_a = invite.responseStepsCompleted) === null || _a === void 0 ? void 0 : _a.includes(step); });
                    if (!hasAllRequiredSteps) {
                        return res.status(400).json({
                            error: "Application requires completion of SCHEDULING, FEEDBACK, and PENDING steps before prompting the user to apply"
                        });
                    }
                }
                // Check response steps history
                const hasForbiddenHistory = (_a = invite.responseStepsCompleted) === null || _a === void 0 ? void 0 : _a.some(step => [client_1.InvitedResponse.DECLINED, client_1.InvitedResponse.REJECTED].includes(step));
                if (hasForbiddenHistory) {
                    return res.status(400).json({
                        error: "This invitation was declined or rejected"
                    });
                }
                // Handle enquiry validation if present
                if (value.enquiryId) {
                    const enquiry = yield logs_services_1.default.getLogsById(value.enquiryId);
                    if (enquiry.status === client_1.logTypeStatus.REJECTED) {
                        return res.status(400).json({ error: "Enquiry is already rejected" });
                    }
                }
                if ([client_1.InvitedResponse.APPLY, client_1.InvitedResponse.RE_INVITED].includes(value.response) &&
                    !value.enquiryId) {
                    return res.status(400).json({ error: "Enquiry ID is required for this response type" });
                }
                if (value.response === client_1.InvitedResponse.RESCHEDULED_ACCEPTED &&
                    !value.reScheduleDate) {
                    return res.status(400).json({ error: "Reschedule date is required" });
                }
                const { enquiryId } = value, updateDate = __rest(value
                // Update invite with validated data
                , ["enquiryId"]);
                // Update invite with validated data
                const updatedInvite = yield application_services_1.default.updateInvite(id, updateDate, enquiryId);
                return res.status(200).json({ updatedInvite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getEnquiredProps = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.user.landlords.id;
                const leasing = yield logs_services_1.default.getLogs(landlordId, client_2.LogType.ENQUIRED, client_1.logTypeStatus.PENDING);
                return res.status(200).json({ leasing });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // for rejection of enquire
        this.updateEnquireToRejected = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const enquireId = req.params.enquireId;
                const leasingUpdated = yield logs_services_1.default.updateLog(enquireId, { status: client_1.logTypeStatus.REJECTED });
                return res.status(200).json({ leasingUpdated });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.deleteInvite = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                // check if the invites was created by the current landlord
                const invitedByLandordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const createdByLandlord = yield application_services_1.default.getInviteById(id);
                if (createdByLandlord.invitedByLandordId != invitedByLandordId)
                    return res.status(200).json({ message: "cannot delete invites not made by you" });
                const deletedInvite = yield application_services_1.default.deleteInvite(id, invitedByLandordId);
                return res.status(200).json({ deletedInvite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getFeedbacks = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.user.landlords.id;
                const feedbacks = yield logs_services_1.default.getLandlordLogs(landlordId, client_2.LogType.FEEDBACK, null);
                return res.status(200).json({ feedbacks });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateApplicationStatusStep = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const applicationId = req.params.id;
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in URL parameters"]
                    });
                }
                const application = yield applicantService_2.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                const { error, value } = applicationInvitesSchema_1.updateApplicationStatusSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const currentStatuses = (_a = application === null || application === void 0 ? void 0 : application.statusesCompleted) !== null && _a !== void 0 ? _a : [];
                if (currentStatuses.includes(client_2.ApplicationStatus.APPROVED) &&
                    value.status === client_2.ApplicationStatus.DECLINED) {
                    return res.status(400).json({ error: "Application has been approved, cannot be declined" });
                }
                if (currentStatuses.includes(client_2.ApplicationStatus.DECLINED) &&
                    value.status === client_2.ApplicationStatus.APPROVED) {
                    return res.status(400).json({ error: "Application has been declined, cannot be approved" });
                }
                const applicationInvite = yield applicantService_2.default.updateApplicationStatusStep(applicationId, value.status);
                return res.status(200).json({ applicationInvite });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.sendApplicationReminder = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            try {
                const applicationId = req.params.id;
                // Validate application ID
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in URL parameters"]
                    });
                }
                const { error, value } = applicationInvitesSchema_1.applicationReminderSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                // Verify application exists
                let application = null;
                if (value.status === applicationInvitesSchema_1.ReminderType.REFERENCE_REMINDER ||
                    value.status === applicationInvitesSchema_1.ReminderType.APPLICATION_REMINDER) {
                    application = yield applicantService_2.default.getApplicationById(applicationId);
                }
                else if (value.status === applicationInvitesSchema_1.ReminderType.SCHEDULE_REMINDER) {
                    application = yield applicantService_2.default.getInvitedById(applicationId);
                }
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                // Check landlord authorization
                const landlordId = req.user.landlords.id;
                if (!landlordId) {
                    return res.status(403).json({ error: "Unauthorized: Missing landlord information" });
                }
                // Check if the landlord is authorized to send reminders for this application
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord) {
                    return res.status(403).json({ error: "Unauthorized: Landlord not found" });
                }
                // Check if the landlord is associated with the application
                const applicationLandlord = yield this.landlordService.getLandlordById((_a = application.properties) === null || _a === void 0 ? void 0 : _a.landlordId);
                if (!applicationLandlord) {
                    return res.status(403).json({ error: "Unauthorized: Landlord not associated with this property application" });
                }
                // Get recipient email
                let recipientEmail = null;
                if (value.status === applicationInvitesSchema_1.ReminderType.REFERENCE_REMINDER ||
                    value.status === applicationInvitesSchema_1.ReminderType.APPLICATION_REMINDER) {
                    recipientEmail = application.user.email;
                }
                else if (value.status === applicationInvitesSchema_1.ReminderType.SCHEDULE_REMINDER) {
                    recipientEmail = (_b = application.userInvited) === null || _b === void 0 ? void 0 : _b.email;
                }
                if (!recipientEmail) {
                    return res.status(400).json({
                        error: "Recipient email not found",
                        message: "Could not retrieve email address for the selected reminder type."
                    });
                }
                // Define email content based on reminder type
                let subject = "";
                let htmlContent = "";
                const firstName = value.status === applicationInvitesSchema_1.ReminderType.SCHEDULE_REMINDER
                    ? (_d = (_c = application === null || application === void 0 ? void 0 : application.userInvited) === null || _c === void 0 ? void 0 : _c.profile) === null || _d === void 0 ? void 0 : _d.firstName
                    : (_f = (_e = application === null || application === void 0 ? void 0 : application.user) === null || _e === void 0 ? void 0 : _e.profile) === null || _f === void 0 ? void 0 : _f.firstName;
                const userId = value.status === applicationInvitesSchema_1.ReminderType.SCHEDULE_REMINDER
                    ? (_g = application === null || application === void 0 ? void 0 : application.userInvited) === null || _g === void 0 ? void 0 : _g.id
                    : (_h = application === null || application === void 0 ? void 0 : application.user) === null || _h === void 0 ? void 0 : _h.id;
                switch (value.status) {
                    case applicationInvitesSchema_1.ReminderType.REFERENCE_REMINDER:
                        subject = "Asher Reference Reminder";
                        htmlContent = `<p>Dear ${firstName}, you have a reference documents reminder.</p>`;
                        yield logs_services_1.default.createLog({
                            applicationId,
                            subjects: "Reference Document Reminder",
                            events: "Please contact your reference to submit your documents as soon as possible.",
                            createdById: userId,
                            type: client_2.LogType.EMAIL,
                        });
                        break;
                    case applicationInvitesSchema_1.ReminderType.APPLICATION_REMINDER:
                        subject = "Asher Application Reminder";
                        htmlContent = `<p>Dear ${firstName}, you have an ongoing application notification reminder. Check your Asher dashboard.</p>`;
                        yield logs_services_1.default.createLog({
                            applicationId,
                            subjects: "Application Reminder",
                            events: `Dear ${firstName}, you have an ongoing application for the property ${(_j = application === null || application === void 0 ? void 0 : application.properties) === null || _j === void 0 ? void 0 : _j.name}`,
                            createdById: userId,
                            type: client_2.LogType.EMAIL,
                        });
                        break;
                    case applicationInvitesSchema_1.ReminderType.SCHEDULE_REMINDER:
                        subject = "Asher Schedule Reminder";
                        htmlContent = `<p>Dear ${firstName}, check your dashboard for an appointment scheduled.</p>`;
                        yield logs_services_1.default.createLog({
                            applicationId,
                            subjects: "Schedule Reminder",
                            events: `Please confirm your scheduled appointment for ${(_k = application === null || application === void 0 ? void 0 : application.properties) === null || _k === void 0 ? void 0 : _k.name}`,
                            createdById: userId,
                            type: client_2.LogType.EMAIL,
                        });
                        break;
                }
                // Send email
                yield (0, emailer_2.default)(recipientEmail, subject, htmlContent);
                return res.status(200).json({
                    message: "Reminder sent successfully",
                    details: { recipient: recipientEmail, type: value.status }
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.updateApplicationVerificationStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.id;
                // Validate application ID
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in URL parameters"]
                    });
                }
                // Verify application exists
                const application = yield applicantService_2.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                // Ensure required fields are not null
                if (!application.referenceForm || !application.guarantorAgreement || !application.employeeReference) {
                    return res.status(400).json({
                        error: "your reference form is not yet completed",
                        details: {
                            referenceForm: application.referenceForm ? "Provided" : "Missing",
                            guarantorAgreement: application.guarantorAgreement ? "Provided" : "Missing",
                            employeeReference: application.employeeReference ? "Provided" : "Missing"
                        }
                    });
                }
                // Perform screenings
                // const landlordScreeningResult = await landlordScreener(application);
                // const guarantorScreeningResult = await guarantorScreener(application);
                // const employmentScreeningResult = await employmentScreener(application);
                // // Consolidate screening results
                // const allScreeningsPassed = landlordScreeningResult && guarantorScreeningResult && employmentScreeningResult;
                // if (!allScreeningsPassed) {
                //     return res.status(400).json({
                //         error: "Application verification failed",
                //         details: {
                //             landlordScreening: landlordScreeningResult,
                //             guarantorScreening: guarantorScreeningResult,
                //             employmentScreening: employmentScreeningResult
                //         }
                //     });
                // }
                // Proceed with updating verification status if all screenings passed
                const screener = yield application_services_1.default.updateVerificationStatus(applicationId, {
                    employmentVerificationStatus: client_1.YesNo.YES,
                    incomeVerificationStatus: client_1.YesNo.YES,
                    creditCheckStatus: client_1.YesNo.YES,
                    landlordVerificationStatus: client_1.YesNo.YES,
                    guarantorVerificationStatus: client_1.YesNo.YES,
                    refereeVerificationStatus: client_1.YesNo.YES,
                });
                return res.status(200).json({ screener });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getCurrentLandlordAgreementForm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const agreementDocument = yield new propertyDocument_service_1.PropertyDocumentService().getManyDocumentBaseOnLandlord(req.user.landlords.id, client_1.DocumentType.AGREEMENT_DOC);
                return res.status(200).json({ agreementDocument });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.sendAgreementForm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            try {
                if (!landlordId) {
                    return res.status(403).json({ error: 'kindly login' });
                }
                const { error, value } = applicationInvitesSchema_1.createAgreementDocSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const applicationId = req.params.id;
                // Validate application ID
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in URL parameters"]
                    });
                }
                // Fetch application
                const application = yield applicantService_2.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                const actualLandlordId = (_c = application.properties) === null || _c === void 0 ? void 0 : _c.landlordId;
                if (req.user.landlords.id !== actualLandlordId) {
                    return res.status(403).json({
                        error: "Unauthorized",
                        message: "You can only send agreement forms for applications on your own properties."
                    });
                }
                // Get recipient email
                const recipientEmail = application.user.email;
                if (!recipientEmail) {
                    return res.status(400).json({
                        error: "Missing recipient email",
                        message: "The applicant's email is required to send the agreement form."
                    });
                }
                const documentUrlModified = value.documentUrls;
                // Build HTML content
                const htmlContent = `
            <div style="font-family: Arial, sans-serif;">
              <h2>Agreement Form Notification</h2>
              <p>Hello,</p>
              <p>Please find the mail inbox on agreement form in your asher mailing box</p>
              <p>Best regards,<br/>Asher</p>
            </div>
          `;
                //send inhouse inbox
                const mailBox = yield emailService_1.default.createEmail({
                    senderEmail: req.user.email,
                    receiverEmail: recipientEmail,
                    body: `Hello, please find and complete the agreement form below: ${documentUrlModified}`,
                    attachment: [documentUrlModified],
                    subject: `Asher - ${(_d = application === null || application === void 0 ? void 0 : application.properties) === null || _d === void 0 ? void 0 : _d.name} Agreement Form`,
                    senderId: req.user.id,
                    receiverId: application.user.id,
                });
                if (!mailBox) {
                    return res.status(400).json({ message: "mail not sent" });
                }
                // Send email
                yield (0, emailer_2.default)(recipientEmail, `Asher - ${(_e = application === null || application === void 0 ? void 0 : application.properties) === null || _e === void 0 ? void 0 : _e.name} Agreement Form`, htmlContent);
                yield logs_services_1.default.createLog({
                    applicationId,
                    subjects: "Asher Agreement Letter",
                    events: `Please check your email for the agreement letter regarding your application for the property: ${(_f = application === null || application === void 0 ? void 0 : application.properties) === null || _f === void 0 ? void 0 : _f.name}`,
                    createdById: application.user.id,
                    type: client_2.LogType.EMAIL,
                });
                yield applicantService_2.default.updateAgreementDocs(applicationId, documentUrlModified);
                // Update the application with the agreement document URL
                yield applicantService_2.default.updateApplicationStatusStep(applicationId, client_2.ApplicationStatus.AGREEMENTS);
                return res.status(200).json({
                    message: "Agreement form email sent successfully",
                    recipient: recipientEmail,
                    agreementDocument: documentUrlModified
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new ApplicationControls();
