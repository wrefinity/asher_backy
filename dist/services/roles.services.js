"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const client_1 = require("@prisma/client");
class RoleManagementService {
    constructor() {
        // Method to assign roles to a user
        this.assignRoles = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, roles } = data;
            // Check if user exists
            const user = yield __1.prismaClient.users.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new Error("User not found");
            }
            // Validate roles (optional): Ensure all roles are valid userRoles
            roles.forEach(role => {
                if (!Object.values(client_1.userRoles).includes(role)) {
                    throw new Error(`Invalid role: ${role}`);
                }
            });
            // Update the user's roles
            const updatedUser = yield __1.prismaClient.users.update({
                where: { id: userId },
                data: { role: roles },
            });
            return updatedUser;
        });
        // Method to get roles of a user
        this.getUserRoles = (userId) => __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user) {
                throw new Error("User not found");
            }
            return user.role;
        });
        // Method to remove roles from a user
        this.removeRoles = (userId, rolesToRemove) => __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new Error("User not found");
            }
            // Filter out roles to remove
            const updatedRoles = user.role.filter((role) => !rolesToRemove.includes(role));
            // Update user roles in database
            const updatedUser = yield __1.prismaClient.users.update({
                where: { id: userId },
                data: { role: updatedRoles },
            });
            return updatedUser;
        });
    }
}
exports.default = new RoleManagementService();
