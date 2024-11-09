import { prismaClient } from "../..";
import {  Prisma } from '@prisma/client';
import { ApplicationInvite } from '../validations/interfaces/applications';



class ApplicationInvitesService {
    createInvite = async (data: Omit<ApplicationInvite, 'id'>) => {
        return await prismaClient.applicationInvites.create({
          data: data as Prisma.applicationInvitesUncheckedCreateInput,
          include: {
            properties: true,
            apartments: true,
            tenants: {
              include: { user: { select: { id: true, email: true } } },
            },
            landlords: {
              include: { user: { select: { id: true, email: true } } },
            },
          },
        });
      };
    // get all invites for applications created by the current landlord
    getInvite = async (id: string, invitedByLandordId:string) => {
        return await prismaClient.applicationInvites.findUnique({
            where: { id, invitedByLandordId },
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: { user: { select: { id: true, email: true, profile:true } } },
                },
                landlords: {
                    include: { user: { select: { id: true, email: true, profile:true } } },
                },
            },
        });
    }

    updateInvite = async (id: string, data: Partial<ApplicationInvite>) => {
        return await prismaClient.applicationInvites.update({
            where: { id },
            data: data as Prisma.applicationInvitesUncheckedCreateInput,
            include: {
                properties: true,
                apartments: true,
                tenants: {
                    include: { user: { select: { id: true, email: true, profile:true } } },
                },
                landlords: {
                    include: { user: { select: { id: true, email: true, profile:true } } },
                },
            },
        });
    }

    deleteInvite = async (id: string, invitedByLandordId:string) => {
        return await prismaClient.applicationInvites.update({
            where: { id, invitedByLandordId },
            data: { isDeleted: true },
        });
    }
    getInviteById = async (id: string) => {
        return await prismaClient.applicationInvites.findFirst({
            where: { id }
        });
    }
}

export default new ApplicationInvitesService();
