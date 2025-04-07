import { prismaClient } from "..";
import { Prisma, logTypeStatus, YesNo, InvitedResponse, ApplicationStatus, ApplicationSaveState, LogType } from "@prisma/client";
import { ApplicationInvite } from "../landlord/validations/interfaces/applications";
import logsServices from "./logs.services";
import applicantService from "../webuser/services/applicantService";
import { VerificationUpdateIF } from "../validations/interfaces/references.interfaces"
class ApplicationInvitesService {
    private userInclusion = { email: true, profile: true, id: true };
    private applicationInclusion = {
        documents: true,
        employmentInfo: true,
        personalDetails: true,
        properties: true,
        emergencyInfo: true,
        guarantorInformation: true,
        residentialInfo: true,
        referenceForm: {
            include: {
                tenancyReferenceHistory: true,
                externalLandlord: true,
                conduct: true,
            }
        },
        employeeReference: true,
        guarantorAgreement: {
            include: {
                documents: true,
                guarantorEmployment: true
            }
        },
        createdBy: {
            select: this.userInclusion
        },
        user: {
            select: this.userInclusion
        }
    }

    private inviteInclude = {
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
            include: this.applicationInclusion
        }
    };

    async createInvite(data: Omit<ApplicationInvite, "id">) {
        return prismaClient.applicationInvites.create({
            data: {
                ...data,
                responseStepsCompleted: { set: data.responseStepsCompleted ?? [] } // Ensure correct array handling
            },
            include: this.inviteInclude,
        });
    }

    async getInvite(filters: {
        invitedByLandordId?: string;
        tenantId?: string;
        userInvitedId?: string;
        status?: logTypeStatus
    }) {
        const whereClause = Object.entries(filters).reduce(
            (acc, [key, value]) => (value ? { ...acc, [key]: value } : acc),
            {} as Prisma.applicationInvitesWhereInput
        );

        return prismaClient.applicationInvites.findMany({
            where: whereClause,
            include: this.inviteInclude,
        });
    }
    async getInviteWithoutStatus(landlordId: string, responseNegation: InvitedResponse[]) {
        return await prismaClient.applicationInvites.findMany({
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
            include: this.inviteInclude,
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    async deleteInvite(id: string, invitedByLandordId: string) {
        return prismaClient.applicationInvites.update({
            where: { id, invitedByLandordId },
            data: { isDeleted: true },
        });
    }

    async getInviteById(id: string) {
        return prismaClient.applicationInvites.findFirst({
            where: { id },
            include: this.inviteInclude,
        });
    }
    async updateInvite(id: string, data: Partial<ApplicationInvite>, enquiryId: string = null) {

        if (data.response === InvitedResponse.APPLY || data.response === InvitedResponse.RE_INVITED && enquiryId) {
            // use the eqnuiry id to update the enquiry status
            await logsServices.updateLog(enquiryId, { type: LogType.ENQUIRED, status: logTypeStatus.RE_INVITED });
        }

        let updated = await prismaClient.applicationInvites.update({
            where: { id },
            data: data as Prisma.applicationInvitesUncheckedUpdateInput,
            include: this.inviteInclude,
        });

        if (updated && data.response) {
            updated = await this.updateInviteResponse(id, data.response)
        }
        return updated;
    }

    async updateInviteResponse(inviteId: string, newResponse: InvitedResponse) {
        const invite = await prismaClient.applicationInvites.findUnique({
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

        return await prismaClient.applicationInvites.update({
            where: { id: inviteId },
            data: {
                response: newResponse, // Update current response
                responseStepsCompleted: updatedResponses // Append if not already present
            },
            include: this.inviteInclude
        });
    }


    async getInvitesWithStatus(landlordId: string, completedStatuses: InvitedResponse[]) {
        return await prismaClient.applicationInvites.findMany({
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
            include: this.inviteInclude,
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    async getDashboardData(userId: String) {
        const [recentInvites, recentFeedback, recentSavedProperties, scheduledInvite, activeApplications, completedApplications] = await Promise.all([
            prismaClient.applicationInvites.findMany({
                orderBy: { createdAt: "desc" },
                take: 3,
                include: this.inviteInclude,
            }),
            prismaClient.log.findMany({
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
            prismaClient.userLikedProperty.findMany({
                where: { userId: String(userId) },  // Fixed line
                include: { property: true },
                orderBy: { likedAt: "desc" },
                take: 3,
            }),
            prismaClient.applicationInvites.findFirst({
                where: { response: InvitedResponse.SCHEDULED },
                orderBy: { createdAt: "desc" },
            }),
            prismaClient.applicationInvites.count({
                where: {

                    NOT: [
                        {
                            responseStepsCompleted: {
                                hasSome: [
                                    InvitedResponse.COMPLETED,
                                    InvitedResponse.REJECTED,
                                    InvitedResponse.CANCELLED,]
                            }
                        }
                    ]
                },
            }),
            prismaClient.applicationInvites.count({ where: { response: InvitedResponse.COMPLETED } }),
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
    }

    getPreviousLandlordInfo = async (applicationId: string) => {
        try {
            // Get residential information with previous addresses
            const residentialInfo = await prismaClient.residentialInformation.findFirst({
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

            if (!residentialInfo?.prevAddresses?.length) {
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
        } catch (error) {
            throw new Error('Could not retrieve landlord information');
        }
    };

    async updateVerificationStatus(applicationId: string, data: VerificationUpdateIF) {
        const application = await applicantService.getApplicationById(applicationId);

        if (!application) {
            throw new Error('Application not found');
        }

        return await prismaClient.application.update({
            where: { id: applicationId },
            data: {
                employmentVerificationStatus: data.employmentVerificationStatus,
                incomeVerificationStatus: data.incomeVerificationStatus,
                creditCheckStatus: data.creditCheckStatus,
                landlordVerificationStatus: data.landlordVerificationStatus,
                guarantorVerificationStatus: data.guarantorVerificationStatus,
                refereeVerificationStatus: data.refereeVerificationStatus,
            },
            include: this.applicationInclusion
        });
    }
}

export default new ApplicationInvitesService();