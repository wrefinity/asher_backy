import { prismaClient } from "..";


class TenantService {

    getCurrentPropertyForTenant = async (userId: string) =>{
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
}

export default new TenantService();
