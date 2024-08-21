import { prismaClient } from "..";
import { hashSync } from "bcrypt";
// import { SignUpIF } from "../interfaces/authInt";
import loggers from "../utils/loggers";
import { userRoles } from "@prisma/client";
import { CreateLandlordIF } from "../validations/interfaces/auth.interface";


class UserService {
    protected inclusion;

    constructor() {
        this.inclusion = {
            tenant: false,
            landlords: false,
            profile: false
        };
    }
    checkexistance = async (obj: object) => {
        const user = await prismaClient.users.findFirst({
            where: { ...obj },
            select: {
                id: true,
                tenant: { select: { id: true } },
                landlords: { select: { id: true } },
                profile: { select: { id: true } },
            }
        });

        // Dynamically build the inclusion object
        if (user.tenant) this.inclusion.tenant = true;
        if (user.landlords) this.inclusion.landlords = true;
        if (user.profile) this.inclusion.profile = true;

        return user
    }
    findUserByEmail = async (email: string) => {
        // Find the user first to check if related entities exist
        const user = await this.checkexistance({ email })
        if (!user) {
            throw new Error('User not found');
        }
        return await prismaClient.users.findFirst({
            where: { email },
            include: this.inclusion,
        });
    }

    findAUserById = async (userId: string) => {
        // Find the user first to check if related entities exist
        const user = await this.checkexistance({ id: String(userId) })
        if (!user) {
            throw new Error('User not found');
        }
        return await prismaClient.users.findFirst({
            where: { id: String(userId) },
            include: this.inclusion,
        });
    }

    createUser = async (userData: any) => {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                role: userData?.role ? [userData.role] : [userRoles?.WEBUSER],
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

    updateUserInfo = async (id: string, userData: any) => {
        const updateData = { ...userData };
        if (userData.password) {
            updateData.password = hashSync(userData.password, 10);
        }
        return await prismaClient.users.update({
            where: { id },
            data: updateData,
        });
    }

    updateUserVerificationStatus = async (userId: string, isVerified: boolean) => {
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
    updateUserPassword = async (userId: string, password: string) => {
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

    createGoogleUser = async (userData: any) => {
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

    createLandlord = async (userData: CreateLandlordIF) => {
        return await prismaClient.users.create({
            data: {
                email: userData?.email,
                password: userData?.password ? hashSync(userData?.password, 10) : null,
                isVerified: userData?.isVerified || false,
                role: [userRoles?.LANDLORD],
                profile: {
                    create: {
                        gender: userData?.profile?.gender,
                        phoneNumber: userData?.profile?.phoneNumber,
                        address: userData?.profile?.address,
                        dateOfBirth: userData?.profile?.dateOfBirth,
                        fullname: userData?.profile?.fullname,
                        profileUrl: userData?.profile?.profileUrl,
                    },
                },
                landlords: {
                    create: {
                        isDeleted: false,
                    },
                },
            },
        });
    }
}

export default new UserService();