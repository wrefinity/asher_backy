import { prismaClient } from "..";
import { Prisma, logTypeStatus, InvitedResponse, ApplicationStatus, LogType } from "@prisma/client";
import { ApplicationInvite } from "../landlord/validations/interfaces/applications";
import logsServices from "./logs.services";

class ApplicationInvitesService {
    private userInclusion = { email: true, profile: true, id: true };

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
        const existingInvite = await this.getInviteById(id);
        if (!existingInvite) throw new Error(`Invite with ID ${id} not found`);

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
    }

    // web user dashboard
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

}

export default new ApplicationInvitesService();
