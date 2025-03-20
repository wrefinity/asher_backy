import { prismaClient } from "../..";
import { Prisma, logTypeStatus, InvitedResponse} from "@prisma/client";
import { ApplicationInvite } from "../validations/interfaces/applications";

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
    async updateInvite(id: string, data: Partial<ApplicationInvite>) {
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
    
}

export default new ApplicationInvitesService();
