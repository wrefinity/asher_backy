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
        this.createOrUpdatePersonalDetails = (data, propertiesId, userId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { title, firstName, invited, middleName, lastName, dob, email, phoneNumber, maritalStatus, nextOfKin, nationality, identificationType, issuingAuthority, expiryDate, } = data;
            const nextOfKinData = {
                firstName: nextOfKin.firstName,
                lastName: nextOfKin.lastName,
                relationship: nextOfKin.relationship,
                email: nextOfKin.email,
                phoneNumber: nextOfKin.phoneNumber,
                middleName: nextOfKin.middleName || null,
            };
            let nextOfKinId;
            // If an existing nextOfKin ID is provided, use it
            if (nextOfKin.id) {
                // Check if the provided nextOfKin ID exists in the database
                const existingNextOfKin = yield __1.prismaClient.nextOfKin.findUnique({
                    where: { id: nextOfKin.id },
                });
                if (!existingNextOfKin) {
                    throw new Error("Next of Kin not found with the provided ID");
                }
                // Use the existing nextOfKin ID
                nextOfKinId = existingNextOfKin.id;
            }
            else {
                // Otherwise, create nextOfKin
                const upsertedNextOfKin = yield __1.prismaClient.nextOfKin.create({
                    data: Object.assign(Object.assign({}, nextOfKinData), { user: { connect: { id: userId } } }),
                });
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
                invited,
                nationality,
                identificationType,
                issuingAuthority,
                expiryDate
            };
            // Check if applicantPersonalDetails already exist by email
            const existingPersonalDetails = yield __1.prismaClient.applicantPersonalDetails.findUnique({
                where: { email },
            });
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
                    userId,
                    applicantPersonalDetailsId: (_a = upsertedPersonalDetails === null || upsertedPersonalDetails === void 0 ? void 0 : upsertedPersonalDetails.id) !== null && _a !== void 0 ? _a : existingPersonalDetails === null || existingPersonalDetails === void 0 ? void 0 : existingPersonalDetails.id,
                },
            });
            return app;
        });
        this.createOrUpdateGuarantor = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            const guarantorInfo = yield __1.prismaClient.guarantorInformation.upsert({
                where: { id: id !== null && id !== void 0 ? id : '' },
                update: rest,
                create: Object.assign({ id }, rest),
            });
            // Find the application associated with the guarantor
            yield __1.prismaClient.application.findUnique({
                where: { id: applicationId },
                include: { guarantorInformation: true }, // Include the current guarantor information
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
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            // Upsert the emergency contact information
            const emergencyInfo = yield __1.prismaClient.emergencyContact.upsert({
                where: { id: id !== null && id !== void 0 ? id : '' },
                update: rest,
                create: Object.assign({ id }, rest),
            });
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
            const refereesInfo = yield __1.prismaClient.referees.upsert({
                where: { id: id !== null && id !== void 0 ? id : '' },
                update: rest,
                create: Object.assign({ id }, rest),
            });
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
        this.createOrUpdatePrevAddresses = (prevAddressesInput) => __awaiter(this, void 0, void 0, function* () {
            const prevAddresses = yield Promise.all(prevAddressesInput.map((input) => __awaiter(this, void 0, void 0, function* () {
                const { id } = input, rest = __rest(input, ["id"]);
                return yield __1.prismaClient.prevAddress.upsert({
                    where: { id: id !== null && id !== void 0 ? id : '' },
                    update: rest,
                    create: rest,
                });
            })));
            return prevAddresses;
        });
        this.createOrUpdateResidentialInformation = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, prevAddresses, userId, applicationId } = data, rest = __rest(data, ["id", "prevAddresses", "userId", "applicationId"]);
            let resInfo = null;
            if (prevAddresses && prevAddresses.length > 0) {
                // Create or update prevAddresses and collect their IDs
                const prevAddressesRes = yield this.createOrUpdatePrevAddresses(prevAddresses);
                const prevAddressesConnect = prevAddressesRes.map((prevAddress) => ({
                    id: prevAddress.id,
                }));
                // Upsert residentialInformation with prevAddresses connected
                resInfo = yield __1.prismaClient.residentialInformation.upsert({
                    where: { id: id !== null && id !== void 0 ? id : '' },
                    update: Object.assign(Object.assign({}, rest), { prevAddresses: {
                            set: prevAddressesConnect,
                        } }),
                    create: Object.assign(Object.assign({}, rest), { prevAddresses: {
                            connect: prevAddressesConnect,
                        } }),
                });
            }
            else {
                // No prevAddresses provided, directly upsert residentialInformation
                resInfo = yield __1.prismaClient.residentialInformation.upsert({
                    where: { id: id !== null && id !== void 0 ? id : '' },
                    update: rest,
                    create: rest,
                });
            }
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
            const { id, applicationId } = data, rest = __rest(data, ["id", "applicationId"]);
            const empInfo = yield __1.prismaClient.employmentInformation.upsert({
                where: { id: id !== null && id !== void 0 ? id : '' },
                update: Object.assign(Object.assign({}, rest), { application: {
                        connect: { id: applicationId },
                    } }),
                create: Object.assign(Object.assign({}, rest), { application: {
                        connect: { id: applicationId },
                    } }),
            });
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
