import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";


class UserService {
    async findUserByEmail(email: string) {
        return await prismaClient.users.findFirst({ where: { email } });
    }

    async findAUserById(userId: string) {
        return await prismaClient.users.findFirst({ where: { id: String(userId) } })
    }

    async createUser(userData: any) {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                role: [userData?.role],
                password: userData.password ? hashSync(userData.password, 10) : null,
                profile: {
                    create: {
                        gender: userData?.gender,
                        phoneNumber: userData?.phoneNumber,
                        address: userData?.address,
                        dateOfBirth: userData?.dateOfBirth,
                        fullname: userData?.fullname,
                        profileUrl: userData?.profileUrl
                    }
                }
            },
        });
    }
      
    async updateUserInfo(id: string, userData: any) {
        const updateData = { ...userData };
        if (userData.password) {
            updateData.password = hashSync(userData.password, 10);
        }
        return await prismaClient.users.update({
            where: { id },
            data: updateData,
        });
    }

    async updateUserVerificationStatus(userId: string, isVerified: boolean) {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: String(userId) },
                data: { isVerified },
            });

            return updatedUser;
        } catch (error) {
            loggers.info(`Error updating user verification status: ${error}`)
            throw new Error('Failed to update user verification status');
        }
    }
    async updateUserPassword(userId: string, password: string) {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: String(userId) },
                data: { password: hashSync(password, 10) },
            });

            return updatedUser;
        } catch (error) {
            loggers.info(`Error updating user verification status: ${error}`)
            throw new Error('Failed to update user verification status');
        }
    }

    async createGoogleUser(userData: any) {
        let user = null
        try {
            user = await this.findUserByEmail(userData.email)
            if (user && user.password) {
                return { error: "A user with this email exists" }
            }
        } catch (error) {
            loggers.error("An error occured while checking for existing.", error)
        }
        try {
            const newUser = await this.createUser(userData)
            return newUser
        } catch (error) {
            loggers.error("An error occured while creating Google user.", error)
            return { error: "An error occured creating Google User" }
        }

    }

}

export default new UserService();