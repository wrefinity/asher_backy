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
class ProfileService {
    constructor() {
        this.findAUserProfileById = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.profile.findFirst({ where: { id: userId }, include: this.inclusion });
        });
        this.findUserProfileByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.profile.findFirst({
                where: {
                    users: {
                        id: userId
                    }
                }
            });
        });
        this.updateUserProfile = (id, profileData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.profile.update({
                where: { id },
                data: profileData,
                include: this.inclusion
            });
        });
        this.activeSearchPreference = (userId) => __awaiter(this, void 0, void 0, function* () {
            const activePreference = yield __1.prismaClient.userSearchPreference.findFirst({
                where: {
                    userId: userId,
                    isActive: true,
                },
            });
            return (activePreference === null || activePreference === void 0 ? void 0 : activePreference.types) || [];
        });
        this.createUserSearchPreference = (input, userId) => __awaiter(this, void 0, void 0, function* () {
            const { description, types } = input;
            // Deactivate all current active preferences
            yield __1.prismaClient.userSearchPreference.updateMany({
                where: {
                    userId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                },
            });
            // Create new preference as active
            const newPreference = yield __1.prismaClient.userSearchPreference.create({
                data: {
                    userId,
                    description,
                    types,
                    isActive: true,
                },
            });
            return newPreference;
        });
        this.inclusion = {
            users: true
        };
    }
}
exports.default = new ProfileService();
