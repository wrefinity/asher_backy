import { prismaClient } from "..";
import {  AdStatus, AdType } from '@prisma/client';


class AdService {

  async createAd(subscriberId: string, subscriberType: any, dto: any) {
    const now = new Date();

    const subscription = await prismaClient.subscriptionAd.findFirst({
      where: {
        subscriberId,
        subscriberType,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No active subscription plan found.');
    }

    const plan = subscription.plan;

    // Count current active ads by type
    const activeCount = await prismaClient.ad.count({
      where: {
        subscriberId,
        subscriberType,
        type: dto.type,
        status: AdStatus.ACTIVE,
      },
    });

    const limits: Record<AdType, number> = {
      BANNER: plan.maxBannerAds,
      FEATURED: plan.maxFeaturedAds,
      NORMAL: plan.maxNormalAds,
    };

    if (activeCount >= (limits[dto.type] || 0)) {
      throw new Error(`Your plan limit for ${dto.type} ads has been reached.`);
    }

    return prismaClient.ad.create({
      data: {
        ...dto,
        subscriberId,
        subscriberType,
        status: AdStatus.PENDING, // admin approval
      },
    });
  }

  async getActiveAds(type?: AdType) {
    const now = new Date();

    return prismaClient.ad.findMany({
      where: {
        status: AdStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
        ...(type && { type }),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async approveAd(adId: string) {
    return prismaClient.ad.update({
      where: { id: adId },
      data: { status: AdStatus.ACTIVE },
    });
  }

  async pauseAd(adId: string) {
    return prismaClient.ad.update({
      where: { id: adId },
      data: { status: AdStatus.PAUSED },
    });
  }

  async trackImpression(adId: string) {
    return prismaClient.ad.update({
      where: { id: adId },
      data: { impressions: { increment: 1 } },
    });
  }

  async trackClick(adId: string) {
    return prismaClient.ad.update({
      where: { id: adId },
      data: { clicks: { increment: 1 } },
    });
  }
  // subcriptions

  async subscribe(
    subscriberId: string,
    subscriberType: any,
    planId: string
  ) {
    const plan = await prismaClient.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) throw new Error('Invalid subscription plan');

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + plan.durationInDays);

    return prismaClient.subscriptionAd.create({
      data: {
        subscriberId,
        subscriberType,
        planId: plan.id,
        startDate: start,
        endDate: end,
      },
    });
  }

  async getPlans() {
    return prismaClient.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }
}

export default new AdService();
