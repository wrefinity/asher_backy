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
            // PropertyTransactions: true,
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
    // getApplicationRequests = async (landlordId: string) => {

    //     return await prismaClient.application.findMany({
    //       where: {
    //         userId: userId,
    //         status,
    //         isDeleted: false,
    //       },
    //       include: {
    //         user: true,
    //         residentialInfo: true,
    //         emergencyInfo: true,
    //         employmentInfo: true,
    //         documents: true,
    //         properties: true,
    //         personalDetails: true,
    //         guarantorInformation: true,
    //       },
    //     });
    //   }
}

export default new TenantService();