import { prismaClient } from "../..";

class AdService {

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
            role: true,
            profile: this.profileSelect,
        }
    }

    async createAd(adData: any, userId: string) {
        return await prismaClient.ads.create({
            data: {
                ...adData,
                userId
            },
        });
    }

    async getAllListedAds() {
        return prismaClient.ads.findMany({
            where: {
                isListed: true,
            }
        });
    }

    async getAllAds() {
        return prismaClient.ads.findMany({});
    }

    async listAds(adId: string) {
        return prismaClient.ads.update({
            where: { id: adId },
            data: { isListed: true },
        })
    }

    async deleteAd(adId: string) {
        return await prismaClient.ads.delete({
            where: { id: adId },
        })
    }

    async getAdsByLocation(location: any) {
        const currentDate = new Date();
        return prismaClient.ads.findMany({
            where: {
                locations: {
                    has: location
                },
                isListed: true,
                startedDate: { lte: currentDate },
                endDate: { gte: currentDate },
            }
        })
    }

    async increamentAdStats(adId: string, statType: string) {
        return prismaClient.ads.update({
            where: { id: adId },
            data: {
                [statType]: { increment: 1 }
            },
        })
    }

    async getAdsByUserId(userId: string) {
        return prismaClient.ads.findMany({
            where: { userId }
        })
    }

    async getAdById(adId: string) {
        return prismaClient.ads.findUnique({
            where: { id: adId },
            include: {
                user: this.userSelect,
            }
        })
    }

    async getAdStats(adId: string) {
        return prismaClient.ads.findUnique({
            where: { id: adId },
            select: {
                views: true,
                reach: true,
                clicks: true,
            }
        })
    }
    
    async updateAd(adId: string, adData: any) {
        return prismaClient.ads.update({
            where: { id: adId },
            data: adData,
        })
    }
}

export default new AdService();