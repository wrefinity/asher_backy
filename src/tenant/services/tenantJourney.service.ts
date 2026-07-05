import { prismaClient } from '../..';
import ApplicantionService from '../../services/application.services';
import ApplicantService from '../../webuser/services/applicantService';
import TenantBillsService from './tenant-bills.service';
import { resolveTenantMilestoneTimeline } from '../../utils/tenantMilestoneTimeline';
import {
  dedupeActivityItems,
  milestonesToActivityItems,
  tenancyDataToActivityItems,
  TenantActivityItem,
  webStatsToActivityItems,
} from '../../utils/tenantActivityTimeline.util';
import { ApiError } from '../../utils/ApiError';

export type TenantJourneyFeed = {
  items: TenantActivityItem[];
  milestones: Awaited<ReturnType<typeof resolveTenantMilestoneTimeline>>;
  application: {
    id: string;
    status: string;
  } | null;
};

class TenantJourneyService {
  private async loadTenantForUser(tenantId: string, userId: string) {
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        id: tenantId,
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        propertyId: true,
        applicationId: true,
        property: {
          select: {
            id: true,
            landlordId: true,
            name: true,
            currency: true,
          },
        },
      },
    });

    if (!tenant) {
      throw ApiError.notFound('Tenant not found');
    }

    if (!tenant.propertyId || !tenant.property?.landlordId) {
      throw ApiError.badRequest('Tenant is not linked to a property');
    }

    return tenant;
  }

  async getJourneyFeed(tenantId: string, userId: string): Promise<TenantJourneyFeed> {
    const tenant = await this.loadTenantForUser(tenantId, userId);
    const propertyId = tenant.propertyId!;
    const landlordId = tenant.property!.landlordId!;

    const [
      milestones,
      webStats,
      maintenanceRequests,
      transactions,
      bills,
      inspections,
      applicationRecord,
    ] = await Promise.all([
      resolveTenantMilestoneTimeline({
        propertyId,
        userId,
        landlordId,
        tenantId: tenant.id,
        applicationId: tenant.applicationId,
      }),
      ApplicantionService.getDashboardData(userId).catch(() => null),
      prismaClient.maintenance.findMany({
        where: { tenantId: tenant.id, isDeleted: false },
        include: { category: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prismaClient.transaction.findMany({
        where: { userId, propertyId },
        include: { property: { select: { currency: true } }, wallet: { select: { currency: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      TenantBillsService.getTenantBills(tenant.id).then((rows) => rows.slice(0, 20)),
      prismaClient.inspection.findMany({
        where: { tenantId: tenant.id },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      tenant.applicationId
        ? ApplicantService.getApplicationById(tenant.applicationId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const items = dedupeActivityItems([
      ...milestonesToActivityItems(milestones),
      ...(webStats ? webStatsToActivityItems(webStats as Record<string, any>) : []),
      ...tenancyDataToActivityItems({
        maintenanceRequests,
        transactions,
        bills,
        inspections,
      }),
    ]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      items,
      milestones,
      application: applicationRecord
        ? { id: applicationRecord.id, status: String(applicationRecord.status) }
        : null,
    };
  }

  /** Shared milestone resolver for legacy application route (pre-tenant applicants). */
  async getMilestonesForApplication(params: {
    userId: string;
    propertyId: string;
    applicationId?: string | null;
  }) {
    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { landlordId: true },
    });

    if (!property?.landlordId) {
      throw ApiError.notFound('Property not found');
    }

    const tenant = await prismaClient.tenants.findFirst({
      where: {
        userId: params.userId,
        propertyId: params.propertyId,
        isDeleted: false,
      },
      select: { id: true, applicationId: true },
      orderBy: { createdAt: 'desc' },
    });

    const resolvedApplicationId =
      params.applicationId ?? tenant?.applicationId ?? null;

    const [milestones, application] = await Promise.all([
      resolveTenantMilestoneTimeline({
        propertyId: params.propertyId,
        userId: params.userId,
        landlordId: property.landlordId,
        tenantId: tenant?.id,
        applicationId: resolvedApplicationId,
      }),
      resolvedApplicationId
        ? ApplicantService.getApplicationById(resolvedApplicationId).catch(() => null)
        : Promise.resolve(null),
    ]);

    return { milestones, application };
  }
}

export default new TenantJourneyService();
