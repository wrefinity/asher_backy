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
}

export default new TenantService();
