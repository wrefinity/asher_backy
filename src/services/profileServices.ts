
import { prismaClient } from "..";
import { ProfileIF } from "../validations/interfaces/profile.interface";


class ProfileService {

    protected inclusion;
    constructor(){
        this.inclusion = {
            users:true
        }
    }
   
    findAUserProfileById = async (userId: string) => {
        return await prismaClient.profile.findFirst({ where: { id: userId }, include: this.inclusion })
    }

    updateUserProfile = async (id: string, profileData: Partial<ProfileIF>)=>{ 
        return await prismaClient.profile.update({
            where: { id },
            data: profileData,
            include:this.inclusion
        });
    }

}

export default new ProfileService();