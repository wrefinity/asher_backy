import { prismaClient } from "../..";

class TenantService {
    protected inclusion: object;
    constructor() {
        this.inclusion = {
            user:  {
                include: {
                    profile: true,
                    nextOfKin: true,
                    residentialInformation: true,
                    applicantion: {
                        include:{
                            employmentInfo: true,
                            emergencyInfo: true,
                            guarantorInformation: true,
                            referee: true
                        }
                    },
                },
            },
            property: true,
            history: true,
            landlord: true,
            apartments: true,
            tenantSupportTicket: true,
            // PropertyTransactions: true,
        }
    }

    getTenantWithUserAndProfile = async (id: string) => {

        return await prismaClient.tenants.findUnique({
            where: { id },
            include: {
                user: {
                    include: {
                        profile: true,
                        nextOfKin: true,
                        applicantion: {
                            include:{
                                employmentInfo: true,
                                emergencyInfo: true,
                                guarantorInformation: true,
                                referee: true
                            }
                        },
                    },
                },
                
                landlord: true,
                property: true,
                apartments: true
            },
        });

    };

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