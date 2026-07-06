import { prismaClient } from "..";
import { Prisma, logTypeStatus, YesNo, InvitedResponse, ApplicationStatus, ApplicationSaveState, LogType, application } from "@prisma/client";
import { ApplicationInvite } from "../landlord/validations/interfaces/applications";
import logsServices from "./logs.services";
import applicantService from "../webuser/services/applicantService";
import { VerificationUpdateIF } from "../validations/interfaces/references.interfaces"
import { ViewingInviteNormalizer } from "../utils/ViewingInviteNormalizer";
import { EngagementNormalizer } from "../utils/EngagementNormalizer";
import { withImplicitInviteSteps } from "../utils/inviteFlowSteps";

const propertySpecificationInclude = {
    where: { isActive: true },
    include: { residential: true, commercial: true },
    take: 1,
};
class ApplicationInvitesService {
    private userInclusion = { email: true, profile: true, id: true };
    private applicationInclusion = {
        documents: true,
        employmentInfo: true,
        personalDetails: true,
        properties: true,
        units: true,
        rooms: true,
        emergencyInfo: true,
        guarantorInformation: true,
        declaration: true,
        residentialInfo: true,
        applicationQuestions: true,
        agreementDocument: true,
        referenceForm: {
            include: {
                tenancyReferenceHistory: true,
                externalLandlord: true,
                conduct: true,
            }
        },
        employeeReference: true,
        guarantorAgreement: {
            include: { documents: true }
        },
        createdBy: {
            select: this.userInclusion
        },
        user: {
            select: this.userInclusion
        }
    }

    private inviteInclude = {
        properties: {
            include: {
                landlord: {
                    select: { user: { select: this.userInclusion } }
                },
                state: true,
                images: true,
                videos: true,
                virtualTours: true,
                propertyDocument: true,
                ratings: true,
                specification: propertySpecificationInclude,
            }
        },
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
        rooms: true,
        units: true,
        application: {
            include: this.applicationInclusion
        }
    };

    async createInvite(data: Omit<ApplicationInvite, "id">, ids: any) {

        const { propertyId: propertiesId, unitId, roomId, propertyListingId: listingFromIds } = ids ?? {};
        const resolvedListingId =
            listingFromIds ?? data.propertyListingId ?? null;

        return prismaClient.applicationInvites.create({
            data: {
                ...data,
                propertyListingId: resolvedListingId,
                propertiesId: propertiesId || undefined,
                roomId: roomId || undefined,           // Only include if room exists
                unitId: unitId || undefined,           // Only include if unit exists
                responseStepsCompleted: { set: data.responseStepsCompleted ?? [] } // Ensure correct array handling
            },
            include: this.inviteInclude,
        });
    }

    async getInvite(filters: {
        invitedByLandordId?: string;
        // tenantId?: string;
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
    async updateMoveInDate(
        applicationId: string,
        moveInDate: Date
    ): Promise<application> {
        return prismaClient.application.update({
            where: { id: applicationId },
            data: {
                moveInDate,
            },
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

        const updatedResponses = withImplicitInviteSteps(
            invite.responseStepsCompleted ?? [],
            newResponse
        );

        return await prismaClient.applicationInvites.update({
            where: { id: inviteId },
            data: {
                response: newResponse,
                responseStepsCompleted: updatedResponses,
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
    async getDashboardData(userId: string) {
        const [
            recentInvites,
            recentFeedback,
            recentSavedProperties,
            scheduledInvite,
            activeApplications,
            completedApplications,
            cancelledApplications,
            declinedApplications,
        ] = await Promise.all([

            prismaClient.applicationInvites.findMany({
                where: { userInvitedId: userId },
                orderBy: { createdAt: "desc" },
                take: 3,
                include: this.inviteInclude,
            }),

            prismaClient.log.findMany({
                where: {
                    createdById: userId,
                    type: { in: [LogType.FEEDBACK, LogType.ENQUIRED, LogType.APPLICATION] },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    property: true,
                    users: {
                        select: { email: true, id: true, profile: true }
                    },
                    applicationInvites: true,
                }
            }),

            prismaClient.userLikedProperty.findMany({
                where: { userId },
                include: {
                    property: {
                        include: {
                            state: true,
                            images: true,
                            specification: propertySpecificationInclude,
                        },
                    },
                },
                orderBy: { likedAt: "desc" },
                take: 3,
            }),

            prismaClient.applicationInvites.findFirst({
                where: {
                    userInvitedId: userId,
                    response: {
                        in: [
                            InvitedResponse.SCHEDULED,
                            InvitedResponse.ACCEPTED,
                            InvitedResponse.RESCHEDULED_ACCEPTED,
                        ],
                    },
                    OR: [
                        { scheduleDate: { gt: new Date() } },
                        { reScheduleDate: { gt: new Date() } },
                    ],
                },
                orderBy: { scheduleDate: "asc" },
                include: this.inviteInclude,
            }),

            prismaClient.application.count({
                where: {
                    userId,
                    isDeleted: false,
                    status: {
                        notIn: [
                            ApplicationStatus.DECLINED,
                            ApplicationStatus.COMPLETED,
                            ApplicationStatus.TENANT_CREATED,
                        ],
                    },
                },
            }),

            prismaClient.application.count({
                where: {
                    userId,
                    isDeleted: false,
                    status: {
                        in: [
                            ApplicationStatus.COMPLETED,
                            ApplicationStatus.TENANT_CREATED,
                        ],
                    },
                },
            }),

            prismaClient.application.count({
                where: {
                    userId,
                    isDeleted: true,
                },
            }),

            prismaClient.application.count({
                where: {
                    userId,
                    isDeleted: false,
                    status: ApplicationStatus.DECLINED,
                },
            }),
        ]);

        const [
            normalizedRecentInvites,
            normalizedScheduledInvite,
        ] = await Promise.all([
            ViewingInviteNormalizer.normalizeMany(recentInvites, userId),
            scheduledInvite
                ? ViewingInviteNormalizer.normalize(scheduledInvite, userId)
                : Promise.resolve(null),
        ]);

        return {
            recentInvites: normalizedRecentInvites,
            recentEngagements:
                EngagementNormalizer.fromNormalizedInvitesMany(
                    normalizedRecentInvites
                ),
            recentFeedback,
            recentSavedProperties: recentSavedProperties
                .map((row: { property?: unknown }) => row.property)
                .filter(Boolean),
            scheduledInvite: normalizedScheduledInvite,
            scheduledEngagement: normalizedScheduledInvite
                ? EngagementNormalizer.fromNormalizedInvite(
                      normalizedScheduledInvite
                  )
                : null,
            applications: {
                activeApplications,
                completedApplications,
                cancelledApplications,
                declinedApplications,
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
    async createNewApplicationFromExisting(
        applicationId: string,
        inviteData: any,
        applicationInviteId: string
    ) {
        // 1. Fetch original application and related data
        const original = await prismaClient.application.findUnique({
            where: { id: applicationId },
            include: {
                personalDetails: true,
                residentialInfo: true,
                emergencyInfo: true,
                employmentInfo: true,
                documents: true,
            },
        });

        if (!original || !original.personalDetails) {
            throw new Error("Original application or personal details not found.");
        }

        // 2. Create a new application
        const newApp = await prismaClient.application.create({
            data: {
                leaseStartDate: inviteData.leaseStartDate,
                leaseEndDate: inviteData.leaseEndDate,
                propertyType: original.propertyType,
                moveInDate: inviteData.moveInDate,
                rentAmountPaid: inviteData.rentAmountPaid,
                securityDeposit: inviteData.securityDeposit,
                leaseTerm: inviteData.leaseTerm,
                users: {
                    connect: { id: original.userId }
                },
                status: inviteData.status,
                lastStep: original.lastStep,

                personalDetails: {
                    connect: { id: original.personalDetails.id },
                },
                residentialInfo: original.residentialInfo
                    ? { connect: { id: original.residentialInfo.id } }
                    : undefined,
                emergencyInfo: original.emergencyInfo
                    ? { connect: { id: original.emergencyInfo.id } }
                    : undefined,
                employmentInfo: original.employmentInfo
                    ? { connect: { id: original.employmentInfo.id } }
                    : undefined,
                documents: {
                    createMany: {
                        data: original.documents.map((doc) => ({
                            documentUrl: doc?.documentUrl,
                            idType: doc?.idType,
                            docType: doc?.docType,
                            size: doc?.size,
                            type: doc?.type,
                            documentName: doc?.documentName,
                        })),
                    },
                },
            },
        });

        // Update the applicationInvite to link the new application
        const updatedInvite = await prismaClient.applicationInvites.update({
            where: { id: applicationInviteId },
            data: {
                application: { connect: { id: newApp.id } },
                // propertiesId: inviteData.propertiesId,
                // invitedByLandordId: inviteData.landlordId,
                // tenantsId: inviteData.tenantId,
                // userInvitedId: inviteData.userInvitedId,
                // enquiryId: inviteData.enquiryId,
            },
        });

        return updatedInvite;
    }


}

export default new ApplicationInvitesService();