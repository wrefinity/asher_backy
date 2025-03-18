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
        this.createInvite = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.create({
                data: data,
                include: {
                    properties: true,
                    apartments: true,
                    tenants: {
                        include: { user: { select: this.userInclusion } },
                    },
                    userInvited: {
                        select: this.userInclusion
                    },
                    landlords: {
                        include: { user: { select: this.userInclusion } },
                    },
                },
            });
        });
        // get all invites for applications created by the current landlord
        this.getInvite = (filters) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.findMany({
                where: Object.assign(Object.assign(Object.assign({}, (filters.invitedByLandordId && { invitedByLandordId: filters.invitedByLandordId })), (filters.tenantId && {
                    tenantsId: filters.tenantId
                })), (filters.userInvitedId && { userInvitedId: filters.userInvitedId })),
                include: {
                    properties: true,
                    apartments: true,
                    tenants: {
                        include: { user: { select: this.userInclusion } },
                    },
                    userInvited: {
                        select: this.userInclusion
                    },
                    landlords: {
                        include: { user: { select: this.userInclusion } },
                    },
                },
            });
        });
        this.updateInvite = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.update({
                where: { id },
                data: data,
                include: {
                    properties: true,
                    apartments: true,
                    tenants: {
                        include: { user: { select: this.userInclusion } },
                    },
                    userInvited: {
                        select: this.userInclusion
                    },
                    landlords: {
                        include: { user: { select: this.userInclusion } },
                    },
                },
            });
        });
        this.deleteInvite = (id, invitedByLandordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.update({
                where: { id, invitedByLandordId },
                data: { isDeleted: true },
            });
        });
        this.getInviteById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicationInvites.findFirst({
                where: { id },
                include: {
                    properties: true,
                    apartments: true,
                    tenants: {
                        include: { user: { select: this.userInclusion } },
                    },
                    userInvited: {
                        select: this.userInclusion
                    },
                    landlords: {
                        include: { user: { select: this.userInclusion } },
                    },
                },
            });
        });
        this.userInclusion = { email: true, profile: true, id: true };
    }
}
exports.default = new ApplicationInvitesService();
