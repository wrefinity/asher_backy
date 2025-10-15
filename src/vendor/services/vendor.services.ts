import { Transaction } from "@thirdweb-dev/sdk";
import { prismaClient } from "../..";
import {IService} from "../validations/interfaces"
import { maintenanceDecisionStatus, maintenanceStatus, TransactionStatus } from ".prisma/client";

interface VendorStats {
  totalRevenue: number
  pendingApproval: number
  paid: number
  newRequests: number
  complete: number
  cancelled: number
  nextAppointment?: Date
}

class ServiceService {
    protected inclusion;
    constructor() {
        this.inclusion = {
            vendor: {
                select: {
                    id: true,
                }
            },
            category: true,
            subcategory: true,
        }    
    }
    
    createService = async (data: any)  => {
        return await prismaClient.services.create({
            data,
            include: this.inclusion
        });
    }

    getService = async (id: string) => {
        return await prismaClient.services.findUnique({
            where: { id },
            include: this.inclusion,
        });
    }
    getVendorById = async (id: string) => {
        return await prismaClient.vendors.findUnique({
            where: { id },
            include: this.inclusion,
        });
    }
    getVendorService = async (vendorId: string) => {
        return await prismaClient.services.findFirst({
            where: { vendorId },
            include: this.inclusion,
        });
    }
    getSpecificVendorService = async (vendorId: string, categoryId: string) => {
        return await prismaClient.services.findFirst({
            where: { vendorId, categoryId },
            include: this.inclusion,
        });
    };

    incrementJobCount = async (serviceId: string, vendorId) => {
        await prismaClient.services.update({
            where: { id: serviceId, vendorId },
            data: {
                currentJobs: {
                    increment: 1,
                },
            },
        });
    }
    decrementJobCount = async (serviceId: string, vendorId: string) => {
        await prismaClient.services.update({
            where: { id: serviceId, vendorId },
            data: {
                currentJobs: {
                    decrement: 1,
                },
            },
        });
    }


    updateService = async (id: string, data: any) => {
        return await prismaClient.services.update({
            where: { id },
            data,
            include: this.inclusion
        });
    }

    deleteService = async (id: string) => {
        return await prismaClient.services.update({
            where: { id },
            data: { isDeleted: true },
            include: this.inclusion
        });
    }

    getAllServices = async () => {
        return await prismaClient.services.findMany({
            where: { isDeleted: false },
            include: this.inclusion
        });
    }

    getServicesByCategory = async (categoryId: string) => {
        return await prismaClient.services.findMany({ where: { categoryId }, include: this.inclusion });
    }

    getServicesByCategoryAndSubcategories = async (categoryId: string, subcategoryIds: string[]) => {
        return await prismaClient.services.findMany({
            where: {
                categoryId,
                subcategoryId: {
                    in: subcategoryIds
                }
            },
            include: this.inclusion
        });
    }

    applyOffer = async (categoryId: string, subcategoryIds: string[], plan: 'standard' | 'medium' | 'premium') => {
        const services = await this.getServicesByCategoryAndSubcategories(categoryId, subcategoryIds)
        console.log(services)
        return services.filter(service => {
            switch (plan) {
                case 'standard':
                    return service.standardPriceRange;
                case 'medium':
                    return service.mediumPriceRange;
                case 'premium':
                    return service.premiumPriceRange;
                default:
                    return false;
            }
        });
    }

    isVendorAllocated = async (vendorId: string): Promise<boolean> => {
        const count = await prismaClient.services.count({
            where: { vendorId },
        });
        return count > 0;
    }

    
getVendorDashboardStatsOptimized = async (vendorId: string): Promise<VendorStats> => {
  const [
    statusCounts,
    paymentStats,
    revenueResult,
    nextAppointment
  ] = await Promise.all([
    // Count by maintenance status
    prismaClient.maintenance.groupBy({
      by: ['status'],
      where: {
        vendorId: vendorId,
        isDeleted: false
      },
      _count: {
        _all: true
      }
    }),

    // Count by payment status
    prismaClient.maintenance.groupBy({
      by: ['paymentStatus'],
      where: {
        vendorId: vendorId,
        isDeleted: false
      },
      _count: {
        _all: true
      }
    }),

    // Sum of completed payments
    prismaClient.maintenance.aggregate({
      where: {
        vendorId: vendorId,
        isDeleted: false,
        paymentStatus: TransactionStatus.COMPLETED
      },
      _sum: {
        amount: true
      }
    }),

    // Next appointment
    prismaClient.maintenance.findFirst({
      where: {
        vendorId: vendorId,
        isDeleted: false,
        scheduleDate: {
          gt: new Date()
        }
      },
      orderBy: {
        scheduleDate: 'asc'
      },
      select: {
        scheduleDate: true
      }
    })
  ])

  // Count pending approval (maintenance with pending landlord decision)
  const pendingApprovalCount = await prismaClient.maintenance.count({
    where: {
      vendorId: vendorId,
      isDeleted: false,
      landlordDecision: maintenanceDecisionStatus.PENDING,
      status: {
        in: [maintenanceStatus.ASSIGNED, maintenanceStatus.IN_PROGRESS]
      }
    }
  })

  // Calculate new requests by explicitly checking each status
  const newRequests = statusCounts.reduce((sum, item) => {
    if (item.status === maintenanceStatus.PENDING || item.status === maintenanceStatus.UNASSIGNED) {
      return sum + item._count._all
    }
    return sum
  }, 0)

  // Find complete and cancelled counts
  const complete = statusCounts.find(s => s.status === maintenanceStatus.COMPLETED)?._count._all || 0
  const cancelled = statusCounts.find(s => s.status === maintenanceStatus.CANCEL)?._count._all || 0

  // Transform the aggregated data
  const stats: VendorStats = {
    totalRevenue: Number(revenueResult._sum.amount) || 0,
    pendingApproval: pendingApprovalCount,
    paid: paymentStats.find(p => p.paymentStatus === TransactionStatus.COMPLETED)?._count._all || 0,
    newRequests,
    complete,
    cancelled,
    nextAppointment: nextAppointment?.scheduleDate || undefined
  }

  return stats
}
}

export default new ServiceService();