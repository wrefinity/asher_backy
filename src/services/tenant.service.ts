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
  getTenantsForProperty = async (propertyId: string, isCurrentLease: boolean = false) => {
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
}

export default new TenantService();
