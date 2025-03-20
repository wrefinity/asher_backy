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
            var _a;
            return __1.prismaClient.applicationInvites.create({
                data: Object.assign(Object.assign({}, data), { responseStepsCompleted: { set: (_a = data.responseStepsCompleted) !== null && _a !== void 0 ? _a : [] } // Ensure correct array handling
                 }),
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
    updateInvite(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let updated = yield __1.prismaClient.applicationInvites.update({
                where: { id },
                data: data,
                include: this.inviteInclude,
            });
            if (updated && data.response) {
                updated = yield this.updateInviteResponse(id, data.response);
            }
            return updated;
        });
    }
    updateInviteResponse(inviteId, newResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            const invite = yield __1.prismaClient.applicationInvites.findUnique({
                where: { id: inviteId },
                select: { responseStepsCompleted: true }
            });
            if (!invite) {
                throw new Error("Invite not found");
            }
            // Check if the response is already in the array
            const updatedResponses = invite.responseStepsCompleted.includes(newResponse)
                ? invite.responseStepsCompleted
                : [...invite.responseStepsCompleted, newResponse];
            return yield __1.prismaClient.applicationInvites.update({
                where: { id: inviteId },
                data: {
                    response: newResponse, // Update current response
                    responseStepsCompleted: updatedResponses // Append if not already present
                },
                include: this.inviteInclude
            });
        });
    }
}
exports.default = new ApplicationInvitesService();
