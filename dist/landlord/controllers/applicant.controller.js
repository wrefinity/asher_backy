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
        this.getApplicationsWithInvites = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const landlordId = req.user.landlords.id;
                const completedStatuses = [
                    client_1.InvitedResponse.PENDING,
                    client_1.InvitedResponse.ACCEPTED,
                    client_1.InvitedResponse.SCHEDULED,
                    client_1.InvitedResponse.FEEDBACK,
                    client_1.InvitedResponse.APPLY,
                    // InvitedResponse.VISITED,
                    // InvitedResponse.NOT_VISITED,
                ];
                const application = yield application_services_1.default.getInvitesWithStatus(landlordId, completedStatuses);
                return res.status(200).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
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
        this.approveApplication = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const applicationId = (_c = req.params) === null || _c === void 0 ? void 0 : _c.applicationId;
                // if (!req.body.email) return res.status(400).json({ message: "kindly supply the new tenant email" })
                const application = yield applicantService_1.default.getApplicationById(applicationId);
                // get the tenant web user email 
                if (!application)
                    return res.status(400).json({ message: "property doesn't exist" });
                const tenantWebUserEmail = application.user.email;
                const userEmail = tenantWebUserEmail.toString().split('@')[0];
                // get the current landlord email domain
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord)
                    return res.status(403).json({ message: "login as a landlord" });
                const email = `${userEmail}${landlord.emailDomains}`;
                // TODO: check if tenant has been a tenant for the current landlord before and just update the property
                const tenant = yield applicantService_1.default.approveApplication(Object.assign(Object.assign({}, req.body), { email,
                    tenantWebUserEmail, propertyId: application.propertiesId, applicationId, password: (_d = application === null || application === void 0 ? void 0 : application.personalDetails) === null || _d === void 0 ? void 0 : _d.firstName, landlordId }));
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
                    client_1.InvitedResponse.SCHEDULED,
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
            try {
                const { id } = req.params;
                const { error, value } = applicationInvitesSchema_1.updateApplicationInviteSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                if (value.response === client_1.InvitedResponse.APPLY || value.response === client_1.InvitedResponse.RE_INVITED && !value.enquireId) {
                    return res.status(400).json({ error: "enquireId is required" });
                }
                const updatedInvite = yield application_services_1.default.updateInvite(id, value);
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
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new ApplicationControls();
