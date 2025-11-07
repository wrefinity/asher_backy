import { prismaClient } from "../..";

class TenantService {
    protected inclusion: object;
    constructor() {
        this.inclusion = {
            user: {
                include: {
                    UserSearchPreference: true,
                    profile: true,
                    nextOfKin: true,
                    residentialInformation: true,
                    application: {
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
            SupportTicket: true,
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
                        application: {
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
                property: true
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


    getTenantsWithEnquiries = async (landlordId: string) => {
        return await prismaClient.tenants.findMany({
            where: {
                PropertyEnquiry: {
                    some: {
                        landlordId: landlordId
                    }
                },
                landlord: {
                    isDeleted: false
                }
            },
            include: {
                user: true, // if tenant has user info
                PropertyEnquiry: {
                    where: {
                        landlordId: landlordId
                    },
                    include: {
                        property: true, // optional: include property details
                        unit: true,     // optional
                        room: true      // optional
                    }
                }
            }
        });
    };

    getCurrentTenantsGeneric = async () => {
        // Get current tenants
        return await prismaClient.tenants.findMany({
            where: {
                isCurrentLease: true,
                user: {
                    UserSearchPreference: {
                        isActive: true,
                    },
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
                        // personalDetails: true,
                        personalDetails: {
                            include: {
                                nextOfKin: true,
                            },
                        },
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

}

export default new TenantService();