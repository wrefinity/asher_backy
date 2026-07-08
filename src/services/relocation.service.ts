import {
  EnquireStatus,
  LogType,
  NotificationCategory,
  Prisma,
  RelocationInterestStatus,
  MoveOutNoticeType,
  EnquiryStatus,
  logTypeStatus,
} from '@prisma/client';
import { prismaClient } from '../db/prismaClient';
import propertyServices from './propertyServices';
import PerformanceCalculator from './PerformanceCalculator';
import NotificationService from './notification.service';
import logsServices from './logs.services';
import moveOutNoticeService from './moveOutNotice.service';
import { PropertySearchDto } from '../validations/interfaces/properties.interface';
import { computeListingMatchScore } from '../utils/listingMatchScore';

/** Display score = overallScore × 10; premium relocate requires ≥ 850 */
export const PREMIUM_RELOCATE_MIN_DISPLAY_SCORE = 850;

export interface PostRelocationInterestInput {
  tenantId: string;
  userId: string;
  criteria: PropertySearchDto & Record<string, unknown>;
  intendedMoveOutDate: Date;
  reason?: string;
  comments?: string;
}

class RelocationService {
  getDisplayScore(overallScore: number) {
    return Math.round(overallScore * 10);
  }

  async getActiveInterest(tenantId: string) {
    return prismaClient.relocationInterest.findFirst({
      where: {
        tenantId,
        status: { in: [RelocationInterestStatus.ACTIVE, RelocationInterestStatus.MATCHED] },
      },
      include: {
        moveOutNotice: true,
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  private async countTotalMatches(tenantId: string) {
    return prismaClient.propertyEnquiry.count({
      where: {
        tenantId,
        status: { not: EnquiryStatus.CLOSED },
      },
    });
  }

  async postInterest(input: PostRelocationInterestInput) {
    const tenant = await prismaClient.tenants.findFirst({
      where: { id: input.tenantId, userId: input.userId, isCurrentLease: true, isDeleted: false },
      include: {
        landlord: { select: { id: true, userId: true } },
        property: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            profile: { select: { fullname: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('TENANT_NOT_FOUND');
    }

    const performance = await PerformanceCalculator.calculateOverallScore(input.userId);
    const displayScore = this.getDisplayScore(performance.overallScore);
    if (displayScore < PREMIUM_RELOCATE_MIN_DISPLAY_SCORE) {
      throw new Error('INSUFFICIENT_SCORE');
    }

    let moveOutNotice = await moveOutNoticeService.getActiveNoticeForTenant(input.tenantId);
    if (!moveOutNotice) {
      try {
        const created = await moveOutNoticeService.createNotice({
          tenantId: input.tenantId,
          intendedMoveOutDate: input.intendedMoveOutDate,
          reason: input.reason || 'Relocating to a new property',
          comments: input.comments,
          type: MoveOutNoticeType.RELOCATING,
          searchCriteria: input.criteria as Prisma.InputJsonValue,
        });
        moveOutNotice = created.notice;
      } catch (err) {
        if (err instanceof Error && err.message === 'ACTIVE_MOVE_OUT_NOTICE_EXISTS') {
          moveOutNotice = await moveOutNoticeService.getActiveNoticeForTenant(input.tenantId);
        } else {
          throw err;
        }
      }
    }

    if (!moveOutNotice) {
      throw new Error('MOVE_OUT_NOTICE_REQUIRED');
    }

    if (moveOutNotice.type !== MoveOutNoticeType.RELOCATING) {
      throw new Error('ACTIVE_LEAVING_NOTICE');
    }

    const [, existingInterest] = await Promise.all([
      prismaClient.moveOutNotice.update({
        where: { id: moveOutNotice.id },
        data: { searchCriteria: input.criteria as Prisma.InputJsonValue },
      }),
      this.getActiveInterest(input.tenantId),
    ]);
    let interest = existingInterest;

    if (existingInterest) {
      interest = await prismaClient.relocationInterest.update({
        where: { id: existingInterest.id },
        data: {
          criteria: input.criteria as Prisma.InputJsonValue,
          postedAt: new Date(),
          status: RelocationInterestStatus.ACTIVE,
          moveOutNoticeId: moveOutNotice.id,
        },
        include: { moveOutNotice: true },
      });
    } else {
      interest = await prismaClient.relocationInterest.create({
        data: {
          tenantId: input.tenantId,
          moveOutNoticeId: moveOutNotice.id,
          criteria: input.criteria as Prisma.InputJsonValue,
          status: RelocationInterestStatus.ACTIVE,
        },
        include: { moveOutNotice: true },
      });
    }

    const listings = await propertyServices.searchPropertiesForRecommendation(input.criteria);
    const currentLandlordId = tenant.landlordId;

    const filtered = listings.filter((listing) => {
      const landlordId = listing.property?.landlord?.id;
      return landlordId && landlordId !== currentLandlordId;
    });

    const bestByLandlord = new Map<
      string,
      { listing: (typeof filtered)[0]; matchScore: number }
    >();
    for (const listing of filtered) {
      const landlordId = listing.property?.landlord?.id;
      if (!landlordId) continue;
      const matchScore = computeListingMatchScore(input.criteria, listing);
      const current = bestByLandlord.get(landlordId);
      if (!current || matchScore > current.matchScore) {
        bestByLandlord.set(landlordId, { listing, matchScore });
      }
    }

    const tenantName =
      tenant.user?.profile?.fullname ||
      [tenant.user?.profile?.firstName, tenant.user?.profile?.lastName].filter(Boolean).join(' ') ||
      'An existing tenant';

    const matchResults = await Promise.all(
      Array.from(bestByLandlord.entries()).map(async ([landlordId, { listing, matchScore }]) => {
        const listingId = listing.listingId;
        const propertyId = listing.hierarchy?.propertyId;
        const unitId = listing.hierarchy?.unitId || undefined;
        const roomId = listing.hierarchy?.roomId || undefined;

        const existingEnquiry = await prismaClient.propertyEnquiry.findFirst({
          where: {
            tenantId: input.tenantId,
            landlordId,
            status: { not: EnquiryStatus.CLOSED },
          },
        });

        const message = `${tenantName} is relocating and matches your listing (${matchScore}% match). Asher score: ${displayScore}/1000.`;

        if (existingEnquiry) {
          const existingScore = existingEnquiry.matchScore ?? 0;
          if (existingScore >= matchScore) return null;

          if (existingEnquiry.logId) {
            await Promise.all([
              logsServices.updateLog(existingEnquiry.logId, {
                propertyId,
                events: message,
                unitId,
                roomId,
                propertyListingId: listingId,
              }),
              prismaClient.propertyEnquiry.update({
                where: { id: existingEnquiry.id },
                data: {
                  message,
                  propertyId,
                  unitId,
                  roomId,
                  propertyListingId: listingId,
                  matchScore,
                },
              }),
            ]);
          } else {
            await prismaClient.propertyEnquiry.update({
              where: { id: existingEnquiry.id },
              data: {
                message,
                propertyId,
                unitId,
                roomId,
                propertyListingId: listingId,
                matchScore,
              },
            });
          }

          return {
            isNew: false,
            landlordId,
            enquiryId: existingEnquiry.id,
            listingId,
            matchScore,
          };
        }

        const log = await logsServices.createLog({
          propertyId,
          events: message,
          createdById: input.userId,
          type: LogType.ENQUIRED,
          enquireStatus: EnquireStatus.EXISTING_TENANT,
          unitId,
          roomId,
          propertyListingId: listingId,
          status: logTypeStatus.PENDING,
        });

        const enquiry = await propertyServices.createEnquiry({
          tenantId: input.tenantId,
          landlordId,
          subject: 'Relocation interest — existing tenant',
          message,
          propertyId,
          unitId,
          roomId,
          logId: log.id,
          propertyListingId: listingId,
          matchScore,
        });

        const landlord = await prismaClient.landlords.findUnique({
          where: { id: landlordId },
          select: { userId: true },
        });

        if (landlord?.userId) {
          await NotificationService.createNotification(
            {
              sourceId: input.userId,
              destId: landlord.userId,
              title: 'Property Match — Relocating Tenant',
              message: `${tenantName} (${displayScore}/1000 Asher score, ${matchScore}% listing match) is interested in your property. Review under Leasing → Existing Tenants.`,
              category: NotificationCategory.PROPERTY_MATCH,
            },
            NotificationCategory.PROPERTY_MATCH
          );
        }

        return { isNew: true, landlordId, enquiryId: enquiry.id, listingId, matchScore };
      })
    );

    const enquiryResults = matchResults.filter(
      (
        result
      ): result is {
        isNew: boolean;
        landlordId: string;
        enquiryId: string;
        listingId: string;
        matchScore: number;
      } => Boolean(result)
    );
    const newMatches = enquiryResults.filter((result) => result.isNew).length;

    const totalMatchCount = await this.countTotalMatches(input.tenantId);

    const updatedInterest = await prismaClient.relocationInterest.update({
      where: { id: interest!.id },
      data: {
        matchCount: totalMatchCount,
        status: totalMatchCount > 0 ? RelocationInterestStatus.MATCHED : RelocationInterestStatus.ACTIVE,
      },
      include: { moveOutNotice: true },
    });

    return {
      interest: updatedInterest,
      displayScore,
      matchCount: totalMatchCount,
      newMatches,
      enquiries: enquiryResults.map(({ isNew, ...result }) => result),
    };
  }
}

export default new RelocationService();
