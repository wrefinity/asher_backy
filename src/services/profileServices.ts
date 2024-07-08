import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { log } from "winston";

class ProfileService {
   

    async findAUserProfileById(userId: number) {
        return await prismaClient.profile.findFirst({ where: { id: userId } })
    }

    async createProfile(profileData: any) {
        return await prismaClient.profile.create({
            data: {
                ...profileData,
            },
        });
    }
    async updateUserProfile(userId: number, profileData: any) { 
        return await prismaClient.profile.update({
            where: { id:userId },
            data: profileData,
        });
    }

}

export default new ProfileService();