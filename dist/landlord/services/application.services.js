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
const __1 = require("../..");
class ApplicationInvitesService {
    constructor() {
        this.userInclusion = { email: true, profile: true, id: true };
        this.inviteInclude = {
            properties: true,
            apartments: true,
            tenants: {
                include: { user: { select: this.userInclusion } },
            },
            userInvited: {
                select: this.userInclusion,
            },
            landlords: {
                include: { user: { select: this.userInclusion } },
            },
        };
    }
    createInvite(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.create({
                data: data,
                include: this.inviteInclude,
            });
        });
    }
    getInvite(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereClause = Object.entries(filters).reduce((acc, [key, value]) => (value ? Object.assign(Object.assign({}, acc), { [key]: value }) : acc), {});
            return __1.prismaClient.applicationInvites.findMany({
                where: whereClause,
                include: this.inviteInclude,
            });
        });
    }
    updateInvite(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.update({
                where: { id },
                data: data,
                include: this.inviteInclude,
            });
        });
    }
    deleteInvite(id, invitedByLandordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.update({
                where: { id, invitedByLandordId },
                data: { isDeleted: true },
            });
        });
    }
    getInviteById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.applicationInvites.findFirst({
                where: { id },
                include: this.inviteInclude,
            });
        });
    }
}
exports.default = new ApplicationInvitesService();
