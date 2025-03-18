import { prismaClient } from "../..";
import { Prisma } from '@prisma/client';
import { ApplicationInvite } from '../validations/interfaces/applications';



class ApplicationInvitesService {
    userInclusion: object;
    constructor() {
        this.userInclusion = { select: { id: true, email: true, profile: true } }
    }
    createInvite = async (data: Omit<ApplicationInvite, 'id'>) => {
        return await prismaClient.applicationInvites.create({
            data: data as Prisma.applicationInvitesUncheckedCreateInput,
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: { user: this.userInclusion },
                },
                userInvited: {
                    select: this.userInclusion
                },
                landlords: {
                    include: { user: this.userInclusion },
                },
            },
        });
    };
    // get all invites for applications created by the current landlord
    getInvite = async (
        filters: {
            invitedByLandordId?: string;
            tenantId?: string;
            userInvitedId?: string;
        }
    ) => {
        return await prismaClient.applicationInvites.findMany({
            where: {
                ...(filters.invitedByLandordId && { invitedByLandordId: filters.invitedByLandordId }),
                ...(filters.tenantId && {
                    tenantsId: filters.tenantId
                }),
                ...(filters.userInvitedId && { userInvitedId: filters.userInvitedId })
            },
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: {
                        user: this.userInclusion
                    },
                },
                userInvited: {
                    select: this.userInclusion
                },
                landlords: {
                    include: {
                        user: this.userInclusion
                    },
                },
            },
        });
    };

    updateInvite = async (id: string, data: Partial<ApplicationInvite>) => {
        return await prismaClient.applicationInvites.update({
            where: { id },
            data: data as Prisma.applicationInvitesUncheckedCreateInput,
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: { user: this.userInclusion },
                },
                userInvited: {
                    select: this.userInclusion
                },
                landlords: {
                    include: { user: this.userInclusion },
                },
            },
        });
    }

    deleteInvite = async (id: string, invitedByLandordId: string) => {
        return await prismaClient.applicationInvites.update({
            where: { id, invitedByLandordId },
            data: { isDeleted: true },
        });
    }
    getInviteById = async (id: string) => {
        return await prismaClient.applicationInvites.findFirst({
            where: { id },
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: { user: this.userInclusion },
                },
                userInvited: {
                    select: this.userInclusion
                },
                landlords: {
                    include: { user: this.userInclusion },
                },
            },
        });
    }
}

export default new ApplicationInvitesService();
