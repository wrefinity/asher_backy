import { prismaClient } from "..";
import { userRoles } from '@prisma/client';

interface IRoleManagement {
    userId: string;
    roles: userRoles[];
}


class RoleManagementService {
    // Method to assign roles to a user
    assignRoles = async (data: IRoleManagement)=>{
        const { userId, roles } = data;

        // Check if user exists
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Validate roles (optional): Ensure all roles are valid userRoles
        roles.forEach(role => {
            if (!Object.values(userRoles).includes(role)) {
                throw new Error(`Invalid role: ${role}`);
            }
        });

        // Update the user's roles
        const updatedUser = await prismaClient.users.update({
            where: { id: userId },
            data: { role: roles },
        });

        return updatedUser;
    }

    // Method to get roles of a user
    getUserRoles = async (userId: string) =>{
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user.role;
    }

    // Method to remove roles from a user
    removeRoles = async (userId: string, rolesToRemove: userRoles[]) =>{
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Filter out roles to remove
        const updatedRoles = user.role.filter((role) => !rolesToRemove.includes(role));

        // Update user roles in database
        const updatedUser = await prismaClient.users.update({
            where: { id: userId },
            data: { role: updatedRoles },
        });

        return updatedUser;
    }
}


export default new RoleManagementService()