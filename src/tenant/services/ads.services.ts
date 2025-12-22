import { prismaClient } from "../..";
import transferServices from "../../services/transfer.services";
import { Currency } from "@prisma/client";
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

    async createAd(adData: any, userId: string, currency: Currency) {

        const transaction = await prismaClient.$transaction(async (prisma) => {
            const ads = await prisma.ads.create({
                data: {
                    ...adData,
                    userId,
                },
            })
            
            //TODO: make ads payment
            //if creating ads is a success we create the payment
            const payment = await transferServices.makeAdsPayments(parseFloat(adData.amountPaid), userId, currency)

            // then we update the ads table
            const updatedAds = await prisma.ads.update({
                where: { id: ads.id },
                data: { referenceId: payment.transactionRecord.id },
            })

            return { ads: updatedAds, payment }

        })
        return transaction.ads;

    }

    async getAllListedAds(filters?: {
        latitude?: number;
        longitude?: number;
        radius?: number;
        city?: string;
        state?: string;
        excludePremium?: boolean;
    }) {
        const currentDate = new Date();

        // Build where clause
        const where: any = {
            isListed: true,
            startedDate: { lte: currentDate },
            endDate: { gte: currentDate },
        };

        // Filter by city or state if provided
        if (filters?.city || filters?.state) {
            const locationFilters: string[] = [];
            if (filters.city) locationFilters.push(filters.city);
            if (filters.state) locationFilters.push(filters.state);

            where.locations = {
                hasSome: locationFilters
            };
        }

        // TODO: Implement geo-spatial filtering with latitude/longitude/radius
        // This requires adding latitude, longitude, radius fields to Ads model
        // For now, we filter by city/state using the locations array

        const ads = await prismaClient.ads.findMany({
            where,
            include: {
                user: this.userSelect,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Filter out premium ads if excludePremium is true
        // Note: This is a temporary solution. Add isPremiumBanner field to schema for better performance
        if (filters?.excludePremium) {
            return ads.filter(ad => {
                const businessDetails = ad.bussinessDetails as any;
                return !businessDetails?.isPremiumBanner;
            });
        }

        return ads;
    }

    async getPremiumBannerAds() {
        const currentDate = new Date();

        const ads = await prismaClient.ads.findMany({
            where: {
                isListed: true,
                startedDate: { lte: currentDate },
                endDate: { gte: currentDate },
            },
            include: {
                user: this.userSelect,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10 // Limit to 10 premium banner ads for carousel
        });

        // Filter only premium banner ads
        // Note: This is a temporary solution. Add isPremiumBanner field to schema for better performance
        return ads.filter(ad => {
            const businessDetails = ad.bussinessDetails as any;
            return businessDetails?.isPremiumBanner === true;
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

    async getAdsByLocation(location: any, isListed: boolean) {
        const currentDate = new Date();
        
        return prismaClient.ads.findMany({
            where: {
                locations: {
                    has: location
                },
                isListed,
                startedDate: { lte: currentDate },
                // endDate: { gte: currentDate },
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

    async getAdExpenses(userId: string) {
        // Get all ad transactions for the user
        // Note: This assumes transactions have reference = 'ADS_PAYMENT' or similar
        // You may need to add ADS_PAYMENT to TransactionReference enum
        const ads = await prismaClient.ads.findMany({
            where: { userId },
            include: {
                transaction: {
                    select: {
                        id: true,
                        amount: true,
                        description: true,
                        createdAt: true,
                        status: true,
                        type: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map to expense format
        return ads.map(ad => ({
            id: ad.id,
            title: ad.title,
            description: ad.description,
            amount: ad.amountPaid,
            date: ad.createdAt,
            transaction: ad.transaction,
            adId: ad.id,
            status: ad.transaction?.status || 'PENDING',
        }));
    }
}

export default new AdService();