import { prismaClient } from "..";


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
  // Fetch all tenants for a given property
  getTenantsForProperty = async (propertyId: string) => {
    // Query the tenants table to get all tenants linked to the propertyId
    const tenants = await prismaClient.tenants.findMany({
      where: {
        propertyId: propertyId,
      },
      include: {
        user: true,
      },
    });
    return tenants;
  }
  // Fetch all tenants for a given property
  getTenantsForLandlord = async (landlordId: string) => {
    // Query the tenants table to get all tenants linked to the landlordId
    const tenants = await prismaClient.tenants.findMany({
      where: {
        landlordId: landlordId,
      },
      include: {
        user: true,
      },
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

    return categorizedTenants;
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

    return categorizedTenants;
  };

}

export default new TenantService();
