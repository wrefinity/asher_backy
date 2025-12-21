import { prismaClient } from "..";
import { TenantNormalizer } from "../utils/TenantNormalizer";


class TenantService {

  getCurrentPropertyForTenant = async (userId: string) => {
    return await prismaClient.tenants.findFirst({
      where: {
        userId: userId,
        isCurrentLease: true,
      },
      include: {
        property: true,
      },
    });
  }

  getUserInfoByTenantId = async (tenantId: string) => {
    const tenant = await prismaClient.tenants.findFirst({
      where: { id: tenantId },
      include: { user: true },
    });
    return tenant?.user || null;
  }
  getTenantByCode = async (tenantCode: string) => {
    return await prismaClient.tenants.findUnique({
      where: { tenantCode },
      select: {
        id: true,
        tenantCode: true,
        propertyId: true,
        unitId: true,
        roomId: true,
      }
    });
  }
  getTenantById = async (tenantId: string) => {
    return await prismaClient.tenants.findFirst({
      where: { id: tenantId },
      include: { user: true },
    });
  }
  getTenantByTenantEmail = async (tenantEmail: string) => {
    return await prismaClient.tenants.findFirst({
      where: { tenantWebUserEmail: tenantEmail },
      include: { user: true },
    });
  }
  
  // Common include structure for tenant queries with all relations
  // Note: applicationQuestions, declarationInfo, employmentInfo, etc. are JSON fields in the tenant model
  // They are included automatically when fetching the tenant, but we also include the application relation
  // which has structured data that may be more complete
  // Performance: Only select essential fields from room/unit to minimize data transfer
  private getTenantInclude() {
    return {
      user: {
        include: {
          profile: true,
        },
      },
      property: {
        include: {
          state: true,
        },
      },
      room: {
        select: {
          id: true,
          roomName: true,
          price: true,
          priceFrequency: true,
        },
      },
      unit: {
        select: {
          id: true,
          unitType: true,
          unitNumber: true,
          price: true,
          priceFrequency: true,
        },
      },
      application: {
        include: {
          personalDetails: {
            include: {
              nextOfKin: true,
            },
          },
          employmentInfo: true,
          guarantorInformation: true,
          residentialInfo: {
            include: {
              prevAddresses: true,
            },
          },
          applicationQuestions: true,
          declaration: true,
          referee: true,
        },
      },
      // These are JSON fields, not relations, so they're automatically included
      // but we can access them as tenant.applicationQuestions, tenant.declarationInfo, etc.
    };
  }
  
  // Fetch all tenants for a given property
  getTenantsForProperty = async (propertyId: string) => {
    // Query the tenants table to get all tenants linked to the propertyId
    const tenants = await prismaClient.tenants.findMany({
      where: {
        propertyId: propertyId,
      },
      include: this.getTenantInclude(),
    });
    return tenants;
  }
  // Fetch all tenants for a given property
  getTenantsForLandlord = async (landlordId: string) => {
    // Query the tenants table to get all tenants linked to the landlordId
    // Use getTenantInclude for consistency and to support normalization
    const tenants = await prismaClient.tenants.findMany({
      where: {
        landlordId: landlordId,
      },
      include: this.getTenantInclude(),
    });
    const currentDate = new Date();
    const categorizedTenants = {
      current: [] as any[],
      previous: [] as any[],
      future: [] as any[]
    };

    tenants.forEach((tenant) => {
      if (!tenant.leaseStartDate) return;

      const leaseStart = new Date(tenant.leaseStartDate);
      const leaseEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null;

      // CURRENT TENANT
      if (
        tenant.isCurrentLease === true ||
        (leaseStart <= currentDate && (!leaseEnd || leaseEnd >= currentDate))
      ) {
        categorizedTenants.current.push(tenant);
        return;
      }

      // PREVIOUS TENANT
      if (leaseEnd && leaseEnd < currentDate) {
        categorizedTenants.previous.push(tenant);
        return;
      }

      // FUTURE TENANT
      if (leaseStart > currentDate) {
        categorizedTenants.future.push(tenant);
        return;
      }
    });

    // Normalize all tenants for consistency
    return {
      current: TenantNormalizer.normalizeMany(categorizedTenants.current),
      previous: TenantNormalizer.normalizeMany(categorizedTenants.previous),
      future: TenantNormalizer.normalizeMany(categorizedTenants.future),
    };
  }


  // Get all tenants for a given property and categorize them into previous, current, and future
  getTenantsByLeaseStatus = async (propertyId: string) => {
    const currentDate = new Date();
    const tenants = await this.getTenantsForProperty(propertyId);

    const categorizedTenants = {
      current: [] as any[],
      previous: [] as any[],
      future: [] as any[]
    };

    tenants.forEach((tenant) => {
      if (!tenant.leaseStartDate) return;

      const leaseStart = new Date(tenant.leaseStartDate);
      const leaseEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : null;

      // CURRENT TENANT
      if (
        tenant.isCurrentLease === true ||
        (leaseStart <= currentDate && (!leaseEnd || leaseEnd >= currentDate))
      ) {
        categorizedTenants.current.push(tenant);
        return;
      }

      // PREVIOUS TENANT
      if (leaseEnd && leaseEnd < currentDate) {
        categorizedTenants.previous.push(tenant);
        return;
      }

      // FUTURE TENANT
      if (leaseStart > currentDate) {
        categorizedTenants.future.push(tenant);
        return;
      }
    });

    // Normalize all tenants using TenantNormalizer
    return {
      current: TenantNormalizer.normalizeMany(categorizedTenants.current),
      previous: TenantNormalizer.normalizeMany(categorizedTenants.previous),
      future: TenantNormalizer.normalizeMany(categorizedTenants.future),
    };
  };

}

export default new TenantService();
