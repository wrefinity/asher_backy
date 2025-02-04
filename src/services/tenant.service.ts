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
  // Fetch all tenants for a given property
  getTenantsForProperty = async (propertyId: string) => {
    // Query the tenants table to get all tenants linked to the propertyId
    const tenants = await prismaClient.tenants.findMany({
      where: {
        propertyId: propertyId,
        isCurrentLease,
      },
      include: {
        user: true,
        apartments: true,
      },
    });
    return tenants;
  }
  // Get all tenants for a given property and categorize them into previous, current, and future
  getTenantsByLeaseStatus = async (propertyId: string) =>{
      // Get the current date to compare with lease dates
      const currentDate = new Date();

      // Fetch tenants for the given property
      const tenants = await this.getTenantsForProperty(propertyId);

      // Categorize tenants into previous, current, and future
      const categorizedTenants = {
        current: [],
        previous: [],
        future: []
      };

      tenants.forEach((tenant) => {
        // Check if the tenant's lease is currently active
        if (tenant.leaseStartDate && tenant.leaseEndDate) {
          const leaseStart = new Date(tenant.leaseStartDate);
          const leaseEnd = new Date(tenant.leaseEndDate);

          // Current tenant: lease is active
          if (leaseStart <= currentDate && leaseEnd >= currentDate) {
            categorizedTenants.current.push(tenant);
          }
          // Previous tenant: lease has ended
          else if (leaseEnd < currentDate) {
            categorizedTenants.previous.push(tenant);
          }
          // Future tenant: lease hasn't started yet
          else if (leaseStart > currentDate) {
            categorizedTenants.future.push(tenant);
          }
        }
      });

      return categorizedTenants;
  }
}

export default new TenantService();
