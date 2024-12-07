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
        this.updateUserProfile = (id, profileData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.profile.update({
                where: { id },
                data: profileData,
                include: this.inclusion
            });
        });
        this.inclusion = {
            users: true
        };
    }
}
exports.default = new ProfileService();
