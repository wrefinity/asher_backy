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
const __1 = require("../..");
const client_1 = require("@prisma/client");
const user_services_1 = __importDefault(require("../../services/user.services"));
const emergencyinfo_services_1 = __importDefault(require("../../services/emergencyinfo.services"));
const guarantor_services_1 = __importDefault(require("../../services/guarantor.services"));
const referees_services_1 = __importDefault(require("../../services/referees.services"));
const residentialinfo_services_1 = __importDefault(require("../../services/residentialinfo.services"));
const employmentinfo_services_1 = __importDefault(require("../../services/employmentinfo.services"));
const personaldetails_services_1 = __importDefault(require("../../services/personaldetails.services"));
const nextkin_services_1 = __importDefault(require("../../services/nextkin.services"));
class ApplicantService {
    constructor() {
        this.incrementStepCompleted = (applicationId, newField) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Fetch the current application details with relevant relationships
            const application = yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                include: {
                    residentialInfo: true,
                    guarantorInformation: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    referee: true
                },
            });
            if (!application) {
                throw new Error(`Application with ID ${applicationId} not found`);
            }
            // Initialize the step increment to the current stepCompleted value
            let stepIncrement = (_a = application.stepCompleted) !== null && _a !== void 0 ? _a : 1;
            // Check if the new field is not connected and increment accordingly
            switch (newField) {
                case 'residentialInfo':
                    if (!application.residentialInfo)
                        stepIncrement += 1;
                    break;
                case 'guarantorInformation':
                    if (!application.guarantorInformation)
                        stepIncrement += 1;
                    break;
                case 'emergencyInfo':
                    if (!application.emergencyInfo)
                        stepIncrement += 1;
                    break;
                case 'employmentInfo':
                    if (!application.employmentInfo)
                        stepIncrement += 1;
                    break;
                case 'refereeInfo':
                    if (!application.referee)
                        stepIncrement += 1;
                    break;
                case 'documents':
                    if (application.documents.length <= 1)
                        stepIncrement += 1;
                    break;
                default:
                    throw new Error(`Invalid field: ${newField}`);
            }
            // Update the application with the incremented stepCompleted value if it changed
            if (stepIncrement !== application.stepCompleted) {
                yield __1.prismaClient.application.update({
                    where: { id: applicationId },
                    data: { stepCompleted: stepIncrement },
                });
            }
        });
        this.createApplication = (data, propertiesId, userId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { title, firstName, invited, middleName, lastName, dob, email, phoneNumber, maritalStatus, nextOfKin, nationality, identificationType, issuingAuthority, expiryDate, } = data;
            const nextOfKinData = {
                id: nextOfKin === null || nextOfKin === void 0 ? void 0 : nextOfKin.id,
                firstName: nextOfKin.firstName,
                lastName: nextOfKin.lastName,
                relationship: nextOfKin.relationship,
                email: nextOfKin.email,
                userId: userId,
                phoneNumber: nextOfKin.phoneNumber,
                middleName: nextOfKin.middleName || null,
            };
            let nextOfKinId;
            // If an existing nextOfKin ID is provided, use it
            if (nextOfKin.id) {
                // Check if the provided nextOfKin ID exists in the database
                const existingNextOfKin = yield nextkin_services_1.default.getNextOfKinById(nextOfKin.id);
                if (!existingNextOfKin) {
                    throw new Error("Next of Kin not found with the provided ID");
                }
                // Use the existing nextOfKin ID
                nextOfKinId = existingNextOfKin.id;
            }
            else {
                // Otherwise, create nextOfKin
                const upsertedNextOfKin = yield nextkin_services_1.default.upsertNextOfKinInfo(Object.assign({}, nextOfKinData));
                nextOfKinId = upsertedNextOfKin.id;
            }
            // Prepare personal details data
            const personalDetailsData = {
                title,
                firstName,
                middleName: middleName || null,
                lastName,
                dob,
                phoneNumber,
                maritalStatus,
                nationality,
                identificationType,
                issuingAuthority,
                expiryDate
            };
            // Check if applicantPersonalDetails already exist by email
            const existingPersonalDetails = yield personaldetails_services_1.default.getApplicantPersonalDetailsByEmail(email);
            let upsertedPersonalDetails;
            if (!existingPersonalDetails) {
                // Create new record if not found
                upsertedPersonalDetails = yield __1.prismaClient.applicantPersonalDetails.create({
                    data: Object.assign(Object.assign({}, personalDetailsData), { email, nextOfKin: { connect: { id: nextOfKinId } } }),
                });
            }
            // Get the current date
            const currentDate = new Date();
            // Calculate the date three months ago (90 days)
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setDate(currentDate.getDate() - 90);
            // Check if the user has an existing application for the same property within the last 3 months
            const recentApplication = yield __1.prismaClient.application.findFirst({
                where: {
                    userId,
                    propertiesId,
                    createdAt: {
                        gte: threeMonthsAgo, // Get applications made within the last 3 months
                    },
                },
            });
            // If a recent application exists, prevent re-application
            if (recentApplication) {
                throw new Error("You have already applied for this property in the last 3 months. Please wait before reapplying.");
            }
            // Create application record
            const app = yield __1.prismaClient.application.create({
                data: {
                    propertiesId,
                    createdById: userId,
                    invited,
                    userId,
                    lastStep: client_1.ApplicationSaveState.PERSONAL_KIN,
                    applicantPersonalDetailsId: (_a = upsertedPersonalDetails === null || upsertedPersonalDetails === void 0 ? void 0 : upsertedPersonalDetails.id) !== null && _a !== void 0 ? _a : existingPersonalDetails === null || existingPersonalDetails === void 0 ? void 0 : existingPersonalDetails.id,
                },
            });
            return app;
        });
        this.createOrUpdateGuarantor = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId, userId } = data, rest = __rest(data, ["id", "applicationId", "userId"]);
            const guarantorInfo = yield guarantor_services_1.default.upsertGuarantorInfo(Object.assign(Object.assign({}, rest), { id, userId }));
            // Find the application associated with the guarantor
            yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                include: { guarantorInformation: true },
            });
            // Update the application with the new or updated guarantor information
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    guarantorInformation: {
                        connect: { id: guarantorInfo.id },
                    },
                },
            });
            yield this.incrementStepCompleted(applicationId, "guarantorInformation");
            return Object.assign(Object.assign({}, guarantorInfo), updatedApplication);
        });
        this.createOrUpdateEmergencyContact = (data) => __awaiter(this, void 0, void 0, function* () {
            const { applicationId, id, userId } = data, rest = __rest(data, ["applicationId", "id", "userId"]);
            // Upsert the emergency contact information
            const emergencyInfo = yield emergencyinfo_services_1.default.upsertEmergencyContact(Object.assign(Object.assign({}, rest), { id, userId }));
            // Update the application with the new or updated emergency contact information
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    emergencyInfo: {
                        connect: { id: emergencyInfo.id },
                    },
                },
            });
            yield this.incrementStepCompleted(applicationId, "emergencyInfo");
            return Object.assign(Object.assign({}, emergencyInfo), updatedApplication);
        });
        this.createOrUpdateReferees = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            // Upsert the emergency contact information
            const refereesInfo = yield referees_services_1.default.upsertRefereeInfo(Object.assign(Object.assign({}, rest), { id }));
            // Update the application with the new or updated referee information
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    referee: {
                        connect: { id: refereesInfo.id },
                    },
                },
            });
            yield this.incrementStepCompleted(applicationId, "refereeInfo");
            return Object.assign(Object.assign({}, refereesInfo), updatedApplication);
        });
        this.createOrUpdateApplicationDoc = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            const docInfo = yield __1.prismaClient.document.upsert({
                where: { id: id !== null && id !== void 0 ? id : '' },
                update: Object.assign(Object.assign({}, rest), { application: {
                        connect: { id: applicationId },
                    } }),
                create: Object.assign(Object.assign({}, rest), { application: {
                        connect: { id: applicationId },
                    } }),
            });
            // Update the application with the new or updated document info
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    documents: {
                        connect: { id: docInfo.id },
                    },
                },
                include: {
                    documents: true,
                    guarantorInformation: true,
                    personalDetails: true,
                }
            });
            yield this.incrementStepCompleted(applicationId, "documents");
            return Object.assign(Object.assign({}, docInfo), updatedApplication);
        });
        this.createOrUpdateResidentialInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, applicationId } = data, rest = __rest(data, ["userId", "applicationId"]);
            // Upsert residentialInformation with prevAddresses connected
            let resInfo = yield residentialinfo_services_1.default.upsertResidentialInformation(Object.assign(Object.assign({}, rest), { userId }));
            // Update the application with the new or updated residential info
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    residentialInfo: {
                        connect: { id: resInfo.id },
                    },
                },
            });
            yield this.incrementStepCompleted(applicationId, "residentialInfo");
            return Object.assign(Object.assign({}, resInfo), updatedApplication);
        });
        this.createOrUpdateEmploymentInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId, userId } = data, rest = __rest(data, ["id", "applicationId", "userId"]);
            const empInfo = yield employmentinfo_services_1.default.upsertEmploymentInfo(Object.assign(Object.assign({}, rest), { id, userId }));
            if (!empInfo) {
                throw new Error(`Failed to create or update EmploymentInformation`);
            }
            // Update the application with the new or employemnt infor
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    employmentInfo: {
                        connect: { id: empInfo.id },
                    },
                },
            });
            yield this.incrementStepCompleted(applicationId, "employmentInfo");
            return Object.assign(Object.assign({}, empInfo), updatedApplication);
        });
        this.deleteApplicant = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.update({
                where: { id },
                data: {
                    isDeleted: true
                }
            });
        });
        this.getPendingApplicationsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findMany({
                where: {
                    status: client_1.ApplicationStatus.PENDING,
                    isDeleted: false,
                    properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    },
                },
                include: {
                    user: true,
                    residentialInfo: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    properties: true,
                    personalDetails: true,
                    guarantorInformation: true,
                },
            });
        });
        this.getCompletedApplications = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findMany({
                where: {
                    status: client_1.ApplicationStatus.COMPLETED,
                    isDeleted: false,
                    properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    },
                },
                include: {
                    user: true,
                    residentialInfo: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    properties: true,
                    personalDetails: true,
                    guarantorInformation: true,
                },
            });
        });
        this.getApplicationById = (applicationId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                include: {
                    user: true,
                    residentialInfo: {
                        include: {
                            prevAddresses: true,
                            user: true,
                        },
                    },
                    guarantorInformation: true,
                    emergencyInfo: true,
                    documents: true,
                    employmentInfo: true,
                    properties: true,
                    personalDetails: {
                        include: {
                            nextOfKin: true,
                        },
                    },
                },
            });
        });
        this.checkApplicationExistance = (applicationId) => __awaiter(this, void 0, void 0, function* () {
            // Check if the application exists
            return yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
            });
        });
        this.updateApplicationStatus = (applicationId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: { status }
            });
        });
        this.checkApplicationCompleted = (applicationId) => __awaiter(this, void 0, void 0, function* () {
            // Check if the application completed
            return yield __1.prismaClient.application.findUnique({
                where: { id: applicationId, status: client_1.ApplicationStatus.COMPLETED },
            });
        });
        this.getApplicationBasedOnStatus = (userId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findMany({
                where: {
                    userId: userId,
                    status,
                    isDeleted: false,
                },
                include: {
                    user: true,
                    residentialInfo: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    properties: true,
                    personalDetails: true,
                    guarantorInformation: true,
                },
            });
        });
        // statistics
        this.countApplicationStatsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            const pendingCount = yield __1.prismaClient.application.count({
                where: {
                    status: client_1.ApplicationStatus.PENDING,
                    isDeleted: false,
                    properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    },
                },
            });
            const approvedCount = yield __1.prismaClient.application.count({
                where: {
                    status: client_1.ApplicationStatus.ACCEPTED,
                    isDeleted: false,
                    properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    },
                },
            });
            const completedCount = yield __1.prismaClient.application.count({
                where: {
                    status: client_1.ApplicationStatus.COMPLETED,
                    isDeleted: false,
                    properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    },
                },
            });
            return {
                pending: pendingCount,
                approved: approvedCount,
                completed: completedCount,
            };
        });
        this.approveApplication = (tenantData) => __awaiter(this, void 0, void 0, function* () {
            return yield user_services_1.default.createUser(Object.assign(Object.assign({}, tenantData), { role: client_1.userRoles.TENANT }));
        });
    }
}
exports.default = new ApplicantService();
