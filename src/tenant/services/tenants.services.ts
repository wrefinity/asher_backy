import { prismaClient } from "../..";

class TenantService {
    protected inclusion: object;
    constructor() {
        this.inclusion = {
            user: true,
            property: true,
            history: true,
            apartments: true,
            tenantSupportTicket: true,
            PropertyTransactions: true,
        }
    }

    getPreviousTenantsForLandlord = async (landlordId: string) => {
        // Get previous tenants
        return await prismaClient.tenants.findMany({
            where: {
                landlordId: landlordId,
                isCurrentLease: false,
                landlord: {
                    isDeleted: false,
                },
            },
            include: this.inclusion
        });
    }
    getCurrenntTenantsForLandlord = async (landlordId: string) => {
        // Get current tenants
        return await prismaClient.tenants.findMany({
            where: {
                landlordId: landlordId,
                isCurrentLease: true,
                landlord: {
                    isDeleted: false,
                },
            },
            include: this.inclusion
        });
    }
    getAllTenants = async (landlordId: string) => {
        return prismaClient.tenants.findMany({
            where: {
                landlordId: landlordId,
                landlord: {
                    isDeleted: false,
                },
            },
            include: this.inclusion,
        });
    }
}

export default new TenantService();