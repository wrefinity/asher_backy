import { prismaClient } from "..";
import { Prisma, logTypeStatus, InvitedResponse} from "@prisma/client";
import { ApplicationInvite } from "../landlord/validations/interfaces/applications";

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
        const existingInvite = await this.getInviteById(id);
        if (!existingInvite) throw new Error(`Invite with ID ${id} not found`);

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


    async getInvitesWithStatus(landlordId:string, completedStatuses: InvitedResponse[]) {
        return await prismaClient.applicationInvites.findMany({
            where: {
             responseStepsCompleted: { hasEvery: completedStatuses },
              isDeleted: false,
              properties:{
                landlordId
              }
            },
            include: {
              properties: true,
              apartments: true,
              landlords: true,
              tenants: true,
              userInvited: true,
              enquires: true,
              application: true
            },
            orderBy: {
              createdAt: "desc"
            }
          });
    }
    
}

export default new ApplicationInvitesService();
