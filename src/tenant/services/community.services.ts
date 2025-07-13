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

}

export default new CommunityService();