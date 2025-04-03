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
const __1 = require("..");
const client_1 = require("@prisma/client");
const logs_services_1 = __importDefault(require("./logs.services"));
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class ApplicationInvitesService {
    constructor() {
        this.userInclusion = { email: true, profile: true, id: true };
        this.inviteInclude = {
            properties: true,
            apartments: true,
            tenants: {
                include: { user: { select: this.userInclusion } },
            },
            userInvited: {
                select: this.userInclusion,
            },
            landlords: {
                include: { user: { select: this.userInclusion } },
            },
            enquires: true,
            application: {
                include: {
                    employmentInfo: true,
                    personalDetails: true,
                    emergencyInfo: true,
                    guarantorInformation: true,
                    residentialInfo: true,
                    createdBy: {
                        select: {
                            email: true,
                            profile: true
                        }
                    }
                }
            }
        };
        this.getPreviousLandlordInfo = (applicationId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Get residential information with previous addresses
                const residentialInfo = yield __1.prismaClient.residentialInformation.findFirst({
                    where: {
                        application: {
                            some: { id: applicationId }
                        }
                    },
                    include: {
                        prevAddresses: {
                            take: 1 // Get only the most recent previous address
                        }
                    }
                });
                if (!((_a = residentialInfo === null || residentialInfo === void 0 ? void 0 : residentialInfo.prevAddresses) === null || _a === void 0 ? void 0 : _a.length)) {
                    return null;
                }
                // Extract most recent previous address with landlord info
                const mostRecentAddress = residentialInfo.prevAddresses[0];
                return {
                    name: residentialInfo.landlordOrAgencyName,
                    email: residentialInfo.landlordOrAgencyEmail,
                    phone: residentialInfo.landlordOrAgencyPhoneNumber,
                    address: mostRecentAddress.address,
                    duration: mostRecentAddress.lengthOfResidence,
                    reasonForLeaving: residentialInfo.reasonForLeaving
                };
            }
            catch (error) {
                throw new Error('Could not retrieve landlord information');
            }
        });
    }
    createInvite(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return __1.prismaClient.applicationInvites.create({
                data: Object.assign(Object.assign({}, data), { responseStepsCompleted: { set: (_a = data.responseStepsCompleted) !== null && _a !== void 0 ? _a : [] } // Ensure correct array handling
                 }),
                include: this.inviteInclude,
            });
        });
    }
    getInvite(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereClause = Object.entries(filters).reduce((acc, [key, value]) => (value ? Object.assign(Object.assign({}, acc), { [key]: value }) : acc), {});
            return __1.prismaClient.applicationInvites.findMany({
                where: whereClause,
                include: this.inviteInclude,
            });
        });
    }
    getInviteWithoutStatus(landlordId, responseNegation) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.findMany({
                where: {
                    NOT: [
                        {
                            responseStepsCompleted: {
                                hasSome: responseNegation
                            }
                        }
                    ],
                    isDeleted: false,
                    properties: {
                        landlordId
                    }
                },
                include: {
                    properties: true,
                    apartments: true,
                    landlords: true,
                    tenants: true,
                    userInvited: {
                        select: this.userInclusion
                    },
                    enquires: true,
                    application: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
        });
    }
    deleteInvite(id, invitedByLandordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.update({
                where: { id, invitedByLandordId },
                data: { isDeleted: true },
            });
        });
    }
    getInviteById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.findFirst({
                where: { id },
                include: this.inviteInclude,
            });
        });
    }
    updateInvite(id_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (id, data, enquiryId = null) {
            if (data.response === client_1.InvitedResponse.APPLY || data.response === client_1.InvitedResponse.RE_INVITED && enquiryId) {
                // use the eqnuiry id to update the enquiry status
                yield logs_services_1.default.updateLog(enquiryId, { type: client_1.LogType.ENQUIRED, status: client_1.logTypeStatus.RE_INVITED });
            }
            let updated = yield __1.prismaClient.applicationInvites.update({
                where: { id },
                data: data,
                include: this.inviteInclude,
            });
            if (updated && data.response) {
                updated = yield this.updateInviteResponse(id, data.response);
            }
            return updated;
        });
    }
    updateInviteResponse(inviteId, newResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            const invite = yield __1.prismaClient.applicationInvites.findUnique({
                where: { id: inviteId },
                select: { responseStepsCompleted: true }
            });
            if (!invite) {
                throw new Error("Invite not found");
            }
            // Check if the response is already in the array
            const updatedResponses = invite.responseStepsCompleted.includes(newResponse)
                ? invite.responseStepsCompleted
                : [...invite.responseStepsCompleted, newResponse];
            return yield __1.prismaClient.applicationInvites.update({
                where: { id: inviteId },
                data: {
                    response: newResponse, // Update current response
                    responseStepsCompleted: updatedResponses // Append if not already present
                },
                include: this.inviteInclude
            });
        });
    }
    getInvitesWithStatus(landlordId, completedStatuses) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.findMany({
                where: {
                    responseStepsCompleted: { hasEvery: completedStatuses },
                    // response: { in: completedStatuses },
                    // response: InvitedResponse.APPLY,
                    isDeleted: false,
                    properties: {
                        landlordId
                    },
                    // application: {
                    //     isNot: null,
                    // }
                },
                include: {
                    properties: true,
                    apartments: true,
                    landlords: true,
                    tenants: true,
                    userInvited: {
                        select: this.userInclusion
                    },
                    enquires: true,
                    application: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
        });
    }
    getDashboardData(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [recentInvites, recentFeedback, recentSavedProperties, scheduledInvite, activeApplications, completedApplications] = yield Promise.all([
                __1.prismaClient.applicationInvites.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 3,
                    include: this.inviteInclude,
                }),
                __1.prismaClient.log.findMany({
                    orderBy: { createdAt: "desc" },
                    take: 3,
                    include: {
                        property: true,
                        users: {
                            select: { email: true, id: true, profile: true }
                        },
                        applicationInvites: true,
                    }
                }),
                __1.prismaClient.userLikedProperty.findMany({
                    where: { userId: String(userId) }, // Fixed line
                    include: { property: true },
                    orderBy: { likedAt: "desc" },
                    take: 3,
                }),
                __1.prismaClient.applicationInvites.findFirst({
                    where: { response: client_1.InvitedResponse.SCHEDULED },
                    orderBy: { createdAt: "desc" },
                }),
                __1.prismaClient.applicationInvites.count({
                    where: {
                        NOT: [
                            {
                                responseStepsCompleted: {
                                    hasSome: [
                                        client_1.InvitedResponse.COMPLETED,
                                        client_1.InvitedResponse.REJECTED,
                                        client_1.InvitedResponse.CANCELLED,
                                    ]
                                }
                            }
                        ]
                    },
                }),
                __1.prismaClient.applicationInvites.count({ where: { response: client_1.InvitedResponse.COMPLETED } }),
            ]);
            return {
                recentInvites,
                recentFeedback,
                recentSavedProperties,
                scheduledInvite,
                applications: {
                    activeApplications,
                    completedApplications,
                },
            };
        });
    }
    updateVerificationStatus(applicationId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const application = yield applicantService_1.default.getApplicationById(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }
            return yield __1.prismaClient.application.update({
                where: { id: applicationId },
                data: {
                    employmentVerificationStatus: data.employmentVerificationStatus,
                    incomeVerificationStatus: data.incomeVerificationStatus,
                    creditCheckStatus: data.creditCheckStatus,
                    landlordVerificationStatus: data.landlordVerificationStatus,
                    guarantorVerificationStatus: data.guarantorVerificationStatus,
                    refereeVerificationStatus: data.refereeVerificationStatus,
                },
            });
        });
    }
}
exports.default = new ApplicationInvitesService();
