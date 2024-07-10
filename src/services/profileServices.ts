import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { log } from "winston";

class ProfileService {
   

    async findAUserProfileById(userId: string) {
        return await prismaClient.profile.findFirst({ where: { id: userId } })
    }

    async createProfile(profileData: any) {
        return await prismaClient.profile.create({
            data: {
                ...profileData,
            },
        });
    }
    async updateUserProfile(id: string, profileData: any) { 
        return await prismaClient.profile.update({
            where: { id },
            data: profileData,
        });
    }

}

export default new ProfileService();