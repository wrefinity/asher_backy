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
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
class CommunityService {
    constructor() {
        this.profileSelect = {
            select: {
                id: true,
                fullname: true,
                profileUrl: true,
            }
        };
        this.userSelect = {
            select: {
                id: true,
                email: true,
                role: true,
                profile: this.profileSelect,
            }
        };
    }
    createCommunity(communityData) {
        return __awaiter(this, void 0, void 0, function* () {
            const community = yield __1.prismaClient.community.create({
                data: Object.assign({}, communityData)
            });
            yield this.createCommunityInvitationLink(community.id);
            return community;
        });
    }
    createCommunityInvitationLink(communityId_1) {
        return __awaiter(this, arguments, void 0, function* (communityId, expiresInDays = 7) {
            const inviteCode = (0, uuid_1.v4)();
            const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
            return __1.prismaClient.communityInvitationLink.create({
                data: {
                    communityId,
                    inviteCode,
                    expiresAt,
                },
            });
        });
    }
    getCommunityInvitationLink(communityId) {
        return __awaiter(this, void 0, void 0, function* () {
            const link = yield __1.prismaClient.communityInvitationLink.findFirst({
                where: { communityId, expiresAt: { gt: new Date() } },
                orderBy: { createdAt: 'desc' }
            });
            if (!link) {
                return this.createCommunityInvitationLink(communityId);
            }
            return link;
        });
    }
    joinCommunityViaInviteLink(inviteCode, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const link = yield __1.prismaClient.communityInvitationLink.findUnique({
                where: { inviteCode, expiresAt: { gt: new Date() } },
                include: { community: true }
            });
            if (!link) {
                throw new Error('Invalid invite link');
            }
            const existingMembers = yield this.getMemberInCommunity(link.communityId, userId);
            if (existingMembers) {
                throw new Error('User already a member of this community');
            }
            return this.addUserToCommunity(link.communityId, userId);
        });
    }
    getPublicCommunities() {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.findMany({
                where: {
                    visibility: client_1.CommunityVisibility.PUBLIC,
                },
                include: {
                    user: this.userSelect,
                }
            });
        });
    }
    getPrivateCommunities() {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.findMany({
                where: {
                    visibility: client_1.CommunityVisibility.PRIVATE,
                }
            });
        });
    }
    getCommunityById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.findFirst({ where: { id } });
        });
    }
    updateCommunity(id, communityData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.update({
                where: { id },
                data: communityData
            });
        });
    }
    deleteCommunity(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.delete({ where: { id } });
        });
    }
    getCommunityOwner(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.community.findUnique({
                where: { id },
                select: {
                    communityOwnerId: true,
                    user: this.userSelect
                }
            });
        });
    }
    getCommunityMembers(communityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityMember.findMany({
                where: {
                    communityId,
                    status: client_1.MembershipStatus.MEMBER,
                },
                include: {
                    user: this.userSelect
                }
            });
        });
    }
    getMemberInCommunity(communityId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityMember.findUnique({
                where: {
                    communityId_userId: {
                        communityId,
                        userId
                    }
                },
                include: {
                    user: this.userSelect
                }
            });
        });
    }
    addUserToCommunity(communityId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityMember.create({
                data: {
                    communityId,
                    userId,
                    status: client_1.MembershipStatus.MEMBER
                },
                include: {
                    user: this.userSelect
                }
            });
        });
    }
    inviteUserToCommunity(communityId, invitedUserId, inviterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const community = yield this.getCommunityById(communityId);
            if (!community)
                throw new Error("Community not found");
            if (community.communityOwnerId !== inviterId)
                throw new Error("Only Community Owner can invite Users");
            const existingMember = yield this.getMemberInCommunity(community.id, invitedUserId);
            if (existingMember && existingMember.status === client_1.MembershipStatus.MEMBER)
                throw new Error("User already a member of the community");
            if (existingMember && existingMember.status === client_1.MembershipStatus.INVITED)
                throw new Error("User has been invited to the community");
            return __1.prismaClient.communityMember.upsert({
                where: {
                    communityId_userId: {
                        communityId,
                        userId: invitedUserId,
                    }
                },
                update: { status: client_1.MembershipStatus.INVITED },
                create: {
                    communityId,
                    userId: invitedUserId,
                    status: client_1.MembershipStatus.INVITED
                }
            });
        });
    }
    rejectInvitation(communityId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const invitedUser = yield this.getMemberInCommunity(communityId, userId);
            if (!invitedUser || invitedUser.status !== client_1.MembershipStatus.INVITED) {
                throw new Error("Invalid invitation");
            }
            return __1.prismaClient.communityMember.update({
                where: {
                    id: invitedUser.id,
                },
                data: {
                    status: client_1.MembershipStatus.REJECTED,
                }
            });
        });
    }
    //clean db
    removeExpiredInvitationLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.communityInvitationLink.deleteMany({
                where: {
                    expiresAt: { lte: new Date() }
                }
            });
        });
    }
    isCommunityMember(communityId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const member = yield this.getMemberInCommunity(communityId, userId);
            return member && member.status === client_1.MembershipStatus.MEMBER;
        });
    }
    createCommunityPost(communityId, postData) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
exports.default = new CommunityService();
