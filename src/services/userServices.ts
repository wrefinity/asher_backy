import { prismaClient } from "..";
import { hashSync } from "bcrypt";
import { SignUpIF } from "../interfaces/authInt";

class UserService {
    async findUserByEmail(email: string) {
        return await prismaClient.users.findFirst({ where: { email } });
    }

    async findAUserById(userId: any) {
        return await prismaClient.users.findUserById({ where: { id: userId } })
    }

    async createUser(userData: SignUpIF) {
        return await prismaClient.users.create({
            data: {
                ...userData,
                password: hashSync(userData.password, 10),
            },
        });
    }

    async updateUserVerificationStatus(userId: bigint, isVerified: boolean) {
        try {
            const updatedUser = await prismaClient.users.update({
                where: { id: userId },
                data: { isVerified },
            });

            return updatedUser;
        } catch (error) {
            console.error('Error updating user verification status:', error);
            throw new Error('Failed to update user verification status');
        }
    }

}

export default UserService;