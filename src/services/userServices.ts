import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { log } from "winston";

class UserService {
    async findUserByEmail(email: string) {
        return await prismaClient.users.findFirst({ where: { email } });
    }

    async findAUserById(userId: number) {
        return await prismaClient.users.findFirst({ where: { id: userId } })
    }

    async createUser(userData: any) {
        return await prismaClient.users.create({
            data: {
                ...userData,
                password: userData.password ? hashSync(userData.password, 10) : null,
            },
        });
    }

    async updateUserVerificationStatus(userId: number, isVerified: boolean) {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: userId },
                data: { isVerified },
            });

            return updatedUser;
        } catch (error) {
            loggers.info(`Error updating user verification status: ${error}`)
            throw new Error('Failed to update user verification status');
        }
    }
    async updateUserPassword(userId: number, password: string) {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: userId },
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