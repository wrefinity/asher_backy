import { prismaClient } from "../..";
import { CommunityVisibility, MembershipStatus } from "@prisma/client";
import { v4 as uuid4 } from 'uuid';
class CommunityService {
    constructor() { }

    private profileSelect = {
        select: {
            id: true,
            fullname: true,
            profileUrl: true,
        }
    }

    private userSelect = {
        select: {
            id: true,
            email: true,
            role: true,
            profile: this.profileSelect,
        }
    }

    async createCommunity(communityData: any) {
        const community = await prismaClient.community.create({
            data: { ...communityData, }
        })

        await this.createCommunityInvitationLink(community.id);

        return community
    }

    async createCommunityInvitationLink(communityId: string, expiresInDays = 7) {
        const inviteCode = uuid4()
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        return prismaClient.communityInvitationLink.create({
            data: {
                communityId,
                inviteCode,
                expiresAt,
            } as any,
        })
    }

    async getCommunityInvitationLink(communityId: string) {
        const link = await prismaClient.communityInvitationLink.findFirst({
            where: { communityId, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        })
        if (!link) {
            return this.createCommunityInvitationLink(communityId);
        }

        return link;
    }

    async joinCommunityViaInviteLink(inviteCode: string, userId: string) {
        const link = await prismaClient.communityInvitationLink.findUnique({
            where: { inviteCode, expiresAt: { gt: new Date() } },
            include: { community: true }
        })

        if (!link) {
            throw new Error('Invalid invite link');
        }
        const existingMembers = await this.getMemberInCommunity(link.communityId, userId);

        if (existingMembers) {
            throw new Error('User already a member of this community');
        }

        return this.addUserToCommunity(link.communityId, userId);
    }

    async getPublicCommunities() {
        return prismaClient.community.findMany({
            where: {
                visibility: CommunityVisibility.PUBLIC,
            },
            include: {
                user: this.userSelect,
            }
        })
    }

    async getPrivateCommunities() {
        return prismaClient.community.findMany({
            where: {
                visibility: CommunityVisibility.PRIVATE,
            }
        })
    }

    async getCommunityById(id: string) {
        return prismaClient.community.findFirst({ where: { id } })
    }

    async updateCommunity(id: string, communityData: any) {
        return prismaClient.community.update({
            where: { id },
            data: communityData
        })
    }

    async deleteCommunity(id: string) {
        return prismaClient.community.delete({ where: { id } })
    }

    async getCommunityOwner(id: string) {

        return prismaClient.community.findUnique({
            where: { id },
            select: {
                communityOwnerId: true,
                user: this.userSelect
            }
        })
    }

    async getCommunityMembers(communityId: string) {
        return prismaClient.communityMember.findMany({
            where: {
                communityId,
                status: MembershipStatus.MEMBER,
            },
            include: {
                user: this.userSelect
            }
        })
    }

    async getMemberInCommunity(communityId: string, userId: string) {
        return prismaClient.communityMember.findUnique({
            where: {
                communityId_userId: {
                    communityId,
                    userId
                }
            },
            include: {
                user: this.userSelect
            }
        })
    }

    async addUserToCommunity(communityId: string, userId: string) {
        return prismaClient.communityMember.create({
            data: {
                communityId,
                userId,
                status: MembershipStatus.MEMBER
            },
            include: {
                user: this.userSelect
            }
        })
    }

    async inviteUserToCommunity(communityId: string, invitedUserId: string, inviterId: string) {
        const community = await this.getCommunityById(communityId)
        if (!community) throw new Error("Community not found");

        if (community.communityOwnerId !== inviterId) throw new Error("Only Community Owner can invite Users");

        const existingMember = await this.getMemberInCommunity(community.id, invitedUserId);
        if (existingMember && existingMember.status === MembershipStatus.MEMBER) throw new Error("User already a member of the community");
        if (existingMember && existingMember.status === MembershipStatus.INVITED) throw new Error("User has been invited to the community");


        return prismaClient.communityMember.upsert({
            where: {
                communityId_userId: {
                    communityId,
                    userId: invitedUserId,
                }
            },
            update: { status: MembershipStatus.INVITED },
            create: {
                communityId,
                userId: invitedUserId,
                status: MembershipStatus.INVITED
            }
        })

    }

    async rejectInvitation(communityId: string, userId: string) {
        const invitedUser = await this.getMemberInCommunity(communityId, userId);
        if (!invitedUser || invitedUser.status !== MembershipStatus.INVITED) {
            throw new Error("Invalid invitation");
        }

        return prismaClient.communityMember.update({
            where: {
                id: invitedUser.id,
            },
            data: {
                status: MembershipStatus.REJECTED,
            }
        })
    }

    //clean db
    async removeExpiredInvitationLinks() {
        return prismaClient.communityInvitationLink.deleteMany({
            where: {
                expiresAt: { lte: new Date() }
            }
        })
    }


    async isCommunityMember(communityId: string, userId: string) {
        const member = await this.getMemberInCommunity(communityId, userId);
        return member && member.status === MembershipStatus.MEMBER;
    }

    async createCommunityPost(communityId: string, postData: any) { }

}

export default new CommunityService();