import { prismaClient } from "../..";
import PerformanceCalculator from "../../services/PerformanceCalculator";
import { EnquireStatus, EnquiryStatus, logTypeStatus } from "@prisma/client"
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
                            referee: true,
                            residentialInfo: {
                                include: {
                                    prevAddresses: true,
                                },
                            },
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
                                referee: true,
                                residentialInfo: {
                                    include: {
                                        prevAddresses: true,
                                    },
                                },
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


    getTenantsWithEnquiries = async (landlordId: string, enquireStatus?: EnquireStatus) => {
        const logFilter = {
            status: logTypeStatus.PENDING,
            ...(enquireStatus ? { enquireStatus } : {}),
        };

        const tenants = await prismaClient.tenants.findMany({
            where: {
                isDeleted: false,
                landlord: {
                    isDeleted: false,
                },
                PropertyEnquiry: {
                    some: {
                        landlordId,
                        status: EnquiryStatus.PENDING,
                        logs: { is: logFilter },
                    },
                },
            },
            include: {
                user: true,
                PropertyEnquiry: {
                    where: {
                        landlordId,
                        status: EnquiryStatus.PENDING,
                        logs: { is: logFilter },
                    },
                    orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
                    include: {
                        property: true,
                        unit: true,
                        room: true,
                        logs: true,
                    },
                },
            },
        });

        // Calculate performance scores for all tenants in parallel
        const tenantsWithScores = await Promise.all(
            tenants.map(async (tenant) => {
                try {
                    const performance = await PerformanceCalculator.calculateOverallScore(tenant.userId);
                    return {
                        ...tenant,
                        performanceScore: performance,
                    };
                } catch (error) {
                    console.error(`Failed to calculate score for tenant ${tenant.userId}:`, error);
                    return {
                        ...tenant,
                        performanceScore: null,
                    };
                }
            })
        );

        return tenantsWithScores.filter((tenant) => tenant.PropertyEnquiry.length > 0);
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
                isDeleted: false,
                landlord: {
                    isDeleted: false,
                },
            },
            include: this.inclusion,
        });
    }
    getAllTenantsOnProperty = async (landlordId: string, propertyId: string) => {
        return prismaClient.tenants.findMany({
            where: {
                landlordId: landlordId,
                landlord: { 
                    isDeleted: false,
                },
                            isCurrentLease: true,
                propertyId: propertyId,
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
                        employmentInfo: true,
                        agreementDocument: true,
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

    setTenantAppAccessSuspended = async (
        landlordId: string,
        tenantId: string,
        suspended: boolean
    ) => {
        const tenant = await prismaClient.tenants.findFirst({
            where: { id: tenantId, landlordId, isDeleted: false },
        });
        if (!tenant) {
            throw new Error('Tenant not found or does not belong to you');
        }

        return prismaClient.tenants.update({
            where: { id: tenantId },
            data: {
                isAppAccessSuspended: suspended,
                appAccessSuspendedAt: suspended ? new Date() : null,
            },
        });
    };

    softDeleteTenant = async (landlordId: string, tenantId: string) => {
        const tenant = await prismaClient.tenants.findFirst({
            where: { id: tenantId, landlordId, isDeleted: false },
        });
        if (!tenant) {
            throw new Error('Tenant not found or does not belong to you');
        }

        const now = new Date();
        return prismaClient.tenants.update({
            where: { id: tenantId },
            data: {
                isDeleted: true,
                isAppAccessSuspended: true,
                appAccessSuspendedAt: now,
                isCurrentLease: false,
                leaseEndDate: tenant.leaseEndDate ?? now,
            },
        });
    };

    bulkSoftDeleteTenants = async (landlordId: string, tenantIds: string[]) => {
        const uniqueIds = [...new Set(tenantIds.filter(Boolean))];
        const deleted: string[] = [];
        const errors: Array<{ tenantId: string; error: string }> = [];

        for (const tenantId of uniqueIds) {
            try {
                await this.softDeleteTenant(landlordId, tenantId);
                deleted.push(tenantId);
            } catch (error: any) {
                errors.push({
                    tenantId,
                    error: error?.message || 'Failed to delete tenant',
                });
            }
        }

        return { deleted, errors };
    };

}

export default new TenantService();