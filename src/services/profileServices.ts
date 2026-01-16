
import { prismaClient } from "..";
import { ProfileIF } from "../validations/interfaces/profile.interface";
import { PropertyType } from ".prisma/client";

interface CreateUserPreferenceInput {
  description: string;
  types: PropertyType[];
}

class ProfileService {

  protected inclusion;
  constructor() {
    this.inclusion = {
      users: true
    }
  }

  findAUserProfileById = async (userId: string) => {
    return await prismaClient.profile.findFirst({ where: { id: userId }, include: this.inclusion })
  }
  findUserProfileByUserId = async (userId: string) => {
    const profile = await prismaClient.profile.findFirst({
      where: {
        users: {
          id: userId
        }
      },
      include: {
        users: {
          include: {
            landlords: {
              select: {
                id: true,
                landlordCode: true,
                businessName: true,
                emailDomains: true,
                isDeleted: true,
                stripeCustomerId: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
              }
            }
          }
        }
      }
    });
    return profile;
  }

  updateUserProfile = async (id: string, profileData: Partial<ProfileIF>) => {
    return await prismaClient.profile.update({
      where: { id },
      data: profileData,
      include: this.inclusion
    });
  }
  activeSearchPreference = async (userId: string) => {
    const activePreference = await prismaClient.userSearchPreference.findFirst({
      where: {
        userId: userId,
        isActive: true,
      },
    });
    return activePreference?.types || [];
  }

  createUserSearchPreference = async (input: CreateUserPreferenceInput, userId: string) => {
    const { description, types } = input;

    // Deactivate all current active preferences
    await prismaClient.userSearchPreference.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new preference as active
    const newPreference = await prismaClient.userSearchPreference.create({
      data: {
        userId,
        description,
        types,
        isActive: true,
      },
    });

    return newPreference;
  }


}

export default new ProfileService();