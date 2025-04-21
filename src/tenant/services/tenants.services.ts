import { prismaClient } from "../..";

class TenantService {
    protected inclusion: object;
    constructor() {
        this.inclusion = {
            user: {
                include: {
                    profile: true,
                    nextOfKin: true,
                    residentialInformation: true,
                    applicantion: {
                        include: {
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

        return await prismaClient.tenants.findFirst({
            where: { id },
            include: {
                user: {
                    include: {
                        profile: true,
                        nextOfKin: true,
                        applicantion: {
                            include: {
                                applicationQuestions: true,
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
        // TODO: get grace period and add the grace period to the 
        // lease end date, then check if cyrrent is greater than it
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
    getCurrentTenantsGeneric = async () => {
        // Get current tenants
        return await prismaClient.tenants.findMany({
            where: {
                isCurrentLease: true,
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

    // getTenantByUserIdAndLandlordId = async (userId: string, landlordId: string) => {

    //     // Query the tenant based on the userId
    //     const tenant = await prismaClient.tenants.findFirst({
    //         where: {
    //             userId: userId, // Filtering by userId
    //             property:{
    //                 landlordId,
    //             }
    //         },
    //         include: {
    //             property: true, // Include related property data
    //         },
    //     });
    //     return tenant
    // }
    getTenantByUserIdAndLandlordId = async (userId?: string, landlordId?: string, tenantId?: string) => {
        const tenant = await prismaClient.tenants.findFirst({
            where: {
                userId,
                // Conditionally include landlordId filter only when it exists
                ...(landlordId && { property: { landlordId } }),
                ...(tenantId && { id: tenantId }),
                ...(userId && { userId })
            },
            include: {
                property: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        isVerified: true,
                        profile: true,
                        applicantPersonalDetails: {
                            include: {
                                nextOfKin: true
                            }
                        },
                        residentialInformation: {
                            include: {
                                prevAddresses: true
                            }
                        },
                        guarantorInformation: true,
                        emergencyContact: true,
                        referees: true,
                        EmploymentInformation: true,
                    }
                },
                application: {
                    include: {
                        applicationQuestions: true,
                        declaration: true,
                        documents: true,
                        emergencyInfo: true,
                        personalDetails: true,
                        guarantorInformation: true,
                        referenceForm: true,
                        guarantorAgreement: true,
                        employeeReference: true,
                        referee: true,
                        residentialInfo: {
                            include: {
                                prevAddresses: true,
                                user: true,
                            },
                        },
                    }
                }
            },
        });

        return tenant;
    };

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