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
const logs_services_1 = __importDefault(require("../../services/logs.services"));
const client_2 = require("@prisma/client");
const application_services_1 = __importDefault(require("../../services/application.services"));
class ApplicantService {
    constructor() {
        this.updateLastStepStop = (applicationId, lastStep) => __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    lastStep
                },
            });
        });
        this.updateCompletedStep = (applicationId, step) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Fetch the current application to get the existing completedSteps
            const application = yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                select: { completedSteps: true },
            });
            // Check if the step already exists in the completedSteps array
            if ((_a = application === null || application === void 0 ? void 0 : application.completedSteps) === null || _a === void 0 ? void 0 : _a.includes(step)) {
                console.log(`Step "${step}" already exists in completedSteps. Skipping update.`);
                return; // Exit the function if the step already exists
            }
            // Create a new array with the step added
            const updatedSteps = [...((application === null || application === void 0 ? void 0 : application.completedSteps) || []), step];
            // Update the application with the new array
            yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    completedSteps: {
                        set: updatedSteps, // Replace the array with the updated array
                    },
                },
            });
            console.log(`Step "${step}" added to completedSteps.`);
        });
        this.incrementStepCompleted = (applicationId, newField) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Fetch the current application details with relevant relationships
            const application = yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                include: {
                    residentialInfo: true,
                    guarantorInformation: true,
                    applicationQuestions: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    referee: true,
                    declaration: true
                },
            });
            if (!application) {
                throw new Error(`Application with ID ${applicationId} not found`);
            }
            // Initialize the step increment to the current stepCompleted value
            let stepIncrement = (_a = application.stepCompleted) !== null && _a !== void 0 ? _a : 1;
            // Check if the new field is connected and increment accordingly
            switch (newField) {
                case 'residentialInfo':
                    if (application.hasOwnProperty('residentialInfo') && application.residentialInfo) {
                        stepIncrement += 1;
                    }
                    break;
                case 'declaration':
                    if (application.hasOwnProperty('declaration') && application.declaration) {
                        stepIncrement += 1;
                    }
                    break;
                case 'additionalInfo':
                    if (application.hasOwnProperty('applicationQuestions') && application.applicationQuestions) {
                        stepIncrement += 1;
                    }
                    break;
                case 'guarantorInformation':
                    if (application.hasOwnProperty('guarantorInformation') && application.guarantorInformation) {
                        stepIncrement += 1;
                    }
                    break;
                case 'emergencyInfo':
                    if (application.hasOwnProperty('emergencyInfo') && application.emergencyInfo) {
                        stepIncrement += 1;
                    }
                    break;
                case 'employmentInfo':
                    if (application.hasOwnProperty('employmentInfo') && application.employmentInfo) {
                        stepIncrement += 1;
                    }
                    break;
                case 'refereeInfo':
                    if (application.hasOwnProperty('referee') && application.referee) {
                        stepIncrement += 1;
                    }
                    break;
                case 'documents':
                    if (application.hasOwnProperty('documents') && application.documents.length == 0) {
                        stepIncrement += 1;
                    }
                    break;
                default:
                    throw new Error(`Invalid field: ${newField}`);
            }
            // Update the application with the incremented stepCompleted value if it changed
            if (stepIncrement !== application.stepCompleted) {
                yield __1.prismaClient.application.update({
                    where: { id: applicationId },
                    data: { stepCompleted: { increment: 1 } },
                });
            }
        });
        this.createApplication = (data, propertiesId, userId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { title, firstName, invited, middleName, lastName, dob, email, applicationInviteId, phoneNumber, maritalStatus, nextOfKin, nationality, identificationType, issuingAuthority, expiryDate, } = data;
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
                    applicationInviteId: applicationInviteId,
                    lastStep: client_1.ApplicationSaveState.PERSONAL_KIN,
                    completedSteps: [client_1.ApplicationSaveState.PERSONAL_KIN],
                    applicantPersonalDetailsId: (_a = upsertedPersonalDetails === null || upsertedPersonalDetails === void 0 ? void 0 : upsertedPersonalDetails.id) !== null && _a !== void 0 ? _a : existingPersonalDetails === null || existingPersonalDetails === void 0 ? void 0 : existingPersonalDetails.id,
                },
            });
            if (app) {
                // check if propertyId have been applied before by the user 
                const logcreated = yield logs_services_1.default.checkPropertyLogs(userId, client_2.LogType.APPLICATION, propertiesId, app === null || app === void 0 ? void 0 : app.id);
                if (!logcreated) {
                    yield logs_services_1.default.createLog({
                        propertyId: propertiesId,
                        subjects: "Application Started",
                        events: "Application in progress",
                        createdById: userId,
                        type: client_2.LogType.APPLICATION,
                        applicationId: app === null || app === void 0 ? void 0 : app.id
                    });
                }
            }
            return app;
        });
        this.createOrUpdateGuarantor = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId, userId } = data, rest = __rest(data, ["id", "applicationId", "userId"]);
            const guarantorInfo = yield guarantor_services_1.default.upsertGuarantorInfo(Object.assign(Object.assign({}, rest), { id, userId }), applicationId);
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
            return Object.assign(Object.assign({}, guarantorInfo), updatedApplication);
        });
        this.createOrUpdateEmergencyContact = (data) => __awaiter(this, void 0, void 0, function* () {
            const { applicationId, id, userId } = data, rest = __rest(data, ["applicationId", "id", "userId"]);
            // Upsert the emergency contact information
            const emergencyInfo = yield emergencyinfo_services_1.default.upsertEmergencyContact(Object.assign(Object.assign({}, rest), { id, userId }), applicationId);
            // Update the application with the new or updated emergency contact information
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    emergencyInfo: {
                        connect: { id: emergencyInfo.id },
                    },
                },
            });
            return Object.assign(Object.assign({}, emergencyInfo), updatedApplication);
        });
        this.createOrUpdateReferees = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            // Upsert the emergency contact information
            const refereesInfo = yield referees_services_1.default.upsertRefereeInfo(Object.assign(Object.assign({}, rest), { id }), applicationId);
            console.log(refereesInfo);
            // Update the application with the new or updated referee information
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    referee: {
                        connect: { id: refereesInfo.id },
                    },
                },
            });
            return Object.assign(Object.assign({}, refereesInfo), updatedApplication);
        });
        this.createOrUpdateApplicationDoc = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId, documentUrl } = data, rest = __rest(data, ["id", "applicationId", "documentUrl"]);
            if (!documentUrl) {
                throw new Error("documentUrl is required");
            }
            let docInfo = null;
            if (id) {
                docInfo = yield __1.prismaClient.document.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { documentUrl, application: {
                            connect: { id: applicationId },
                        } }),
                });
            }
            else {
                docInfo = yield __1.prismaClient.document.create({
                    data: Object.assign(Object.assign({}, rest), { documentUrl, application: {
                            connect: { id: applicationId },
                        } }),
                });
                // Update progress
                yield this.incrementStepCompleted(applicationId, "documents");
                yield this.updateLastStepStop(applicationId, client_1.ApplicationSaveState.DOCUMENT_UPLOAD);
                yield this.updateCompletedStep(applicationId, client_1.ApplicationSaveState.DOCUMENT_UPLOAD);
            }
            // Update application with the new document
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
                },
            });
            return Object.assign(Object.assign({}, docInfo), updatedApplication);
        });
        this.createOrUpdateResidentialInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, applicationId } = data, rest = __rest(data, ["userId", "applicationId"]);
            // Upsert residentialInformation with prevAddresses connected
            let resInfo = yield residentialinfo_services_1.default.upsertResidentialInformation(Object.assign(Object.assign({}, rest), { userId }), applicationId);
            // Update the application with the new or updated residential info
            const updatedApplication = yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    residentialInfo: {
                        connect: { id: resInfo.id },
                    },
                },
            });
            return Object.assign(Object.assign({}, resInfo), updatedApplication);
        });
        this.createOrUpdateDeclaration = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, id, applicationId } = data, rest = __rest(data, ["userId", "id", "applicationId"]);
            if (id) {
                // Check if the residentialInformation exists
                const existingRecord = yield __1.prismaClient.declaration.findFirst({
                    where: { id }
                });
                if (!existingRecord) {
                    throw new Error(`declaration with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.declaration.update({
                    where: { id },
                    data: Object.assign({}, rest),
                });
            }
            else {
                // Perform create if ID does not exist
                const declared = yield __1.prismaClient.declaration.create({
                    data: Object.assign(Object.assign({}, rest), { application: applicationId
                            ? { connect: { id: applicationId } }
                            : undefined }),
                });
                if (declared) {
                    yield this.incrementStepCompleted(applicationId, "declaration");
                    yield this.updateLastStepStop(applicationId, client_1.ApplicationSaveState.DECLARATION);
                    yield this.updateCompletedStep(applicationId, client_1.ApplicationSaveState.DECLARATION);
                }
                yield this.updateApplicationStatus(applicationId, client_1.ApplicationStatus.SUBMITTED);
                return declared;
            }
            return;
        });
        this.createOrUpdateEmploymentInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId, userId } = data, rest = __rest(data, ["id", "applicationId", "userId"]);
            const empInfo = yield employmentinfo_services_1.default.upsertEmploymentInfo(Object.assign(Object.assign({}, rest), { id, userId }), applicationId);
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
            return Object.assign(Object.assign({}, empInfo), updatedApplication);
        });
        this.createOrUpdateAdditionalInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            // Check if an ID is provided
            if (id) {
                return yield __1.prismaClient.applicationQuestions.update({
                    where: { id },
                    data: rest,
                });
            }
            else {
                // Create a new record since no ID was provided
                const newRecord = yield __1.prismaClient.applicationQuestions.create({
                    data: Object.assign({ application: { connect: { id: applicationId } } }, rest),
                });
                if (newRecord) {
                    yield this.updateLastStepStop(applicationId, client_1.ApplicationSaveState.ADDITIONAL_INFO);
                    yield this.updateCompletedStep(applicationId, client_1.ApplicationSaveState.ADDITIONAL_INFO);
                    yield this.incrementStepCompleted(applicationId, "additionalInfo");
                }
                return newRecord;
            }
        });
        this.deleteApplicant = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.update({
                where: { id },
                data: {
                    isDeleted: true
                }
            });
        });
        this.getApplicationsForLandlordWithStatus = (landlordId, status // Make status optional
        ) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findMany({
                where: Object.assign(Object.assign({}, (status && { status })), { isDeleted: false, properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    } }),
                include: {
                    user: true,
                    residentialInfo: true,
                    emergencyInfo: true,
                    employmentInfo: true,
                    documents: true,
                    properties: true,
                    personalDetails: true,
                    guarantorInformation: true,
                    applicationQuestions: true,
                    declaration: true
                },
            });
        });
        this.getApplicationCountForLandlordWithStatus = (landlordId, status // Make status optional
        ) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.count({
                where: Object.assign(Object.assign({}, (status && { status })), { isDeleted: false, properties: {
                        landlordId: landlordId,
                        isDeleted: false,
                    } }),
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
                    referee: true,
                    Log: true,
                    declaration: true,
                    applicationQuestions: true,
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
            return yield __1.prismaClient.application.findFirst({
                where: { id: applicationId, status: client_1.ApplicationStatus.COMPLETED },
            });
        });
        this.getApplicationBasedOnStatus = (userId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.application.findMany({
                where: {
                    userId: userId,
                    status: Array.isArray(status) ? { in: status } : status,
                    isDeleted: false,
                },
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
                    referee: true,
                    Log: true,
                    declaration: true,
                    applicationQuestions: true,
                    personalDetails: {
                        include: {
                            nextOfKin: true,
                        },
                    },
                },
            });
        });
        // statistics
        this.countApplicationStatsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return {
                pending: yield this.getApplicationCountForLandlordWithStatus(landlordId, client_1.ApplicationStatus.PENDING),
                approved: yield this.getApplicationCountForLandlordWithStatus(landlordId, client_1.ApplicationStatus.ACCEPTED),
                completed: yield this.getApplicationCountForLandlordWithStatus(landlordId, client_1.ApplicationStatus.COMPLETED),
                total: yield this.getApplicationCountForLandlordWithStatus(landlordId),
            };
        });
        this.approveApplication = (tenantData) => __awaiter(this, void 0, void 0, function* () {
            return yield user_services_1.default.createUser(Object.assign(Object.assign({}, tenantData), { role: client_1.userRoles.TENANT }));
        });
        this.getInvitedById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.findUnique({
                where: { id },
                include: {
                    properties: {
                        include: {
                            landlord: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            profile: true
                                        },
                                    },
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    getInvite(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereClause = {};
            if (filters.userInvitedId) {
                whereClause.userInvitedId = filters.userInvitedId;
            }
            if (filters.response) {
                whereClause.response = {
                    in: filters.response
                };
            }
            return yield __1.prismaClient.applicationInvites.findMany({
                where: whereClause,
                include: {
                    properties: {
                        include: {
                            landlord: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            profile: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    }
    updateInvites(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield application_services_1.default.updateInvite(id, updateData);
        });
    }
}
exports.default = new ApplicantService();
