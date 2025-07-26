
import { ApplicationStatus, maintenanceStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "../..";

class LandlordDashboardService {

  async getDashboardData(landlordId: string, filters: any, landlordUserId?: string) {
    const properties = await prismaClient.properties.findMany({
      where: { landlordId, isDeleted: false },
      select: { id: true, availability: true },
    });

    const totalProperties = properties.length;
    const vacant = properties.filter(p => p.availability === 'VACANT').length;
    const occupied = totalProperties - vacant;

    const transactions = await prismaClient.transaction.findMany({
      where: {
        OR: [{
          userId: landlordId,
          property: { landlordId },
        }
        ],
        createdAt: filters?.from && filters?.to ? {
          gte: new Date(filters.from),
          lte: new Date(filters.to),
        } : undefined
      },
    });

    const income = transactions.filter(t => t.type === TransactionType.CREDIT).reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === TransactionType.DEBIT).reduce((sum, t) => sum + Number(t.amount), 0);

    const maintenance = await prismaClient.maintenance.findMany({
      where: { property: { landlordId } },
      select: { status: true }
    });

    const maintenanceStats = {
      total: maintenance.length,
      inProgress: maintenance.filter(m => m.status === maintenanceStatus.PENDING).length,
      completed: maintenance.filter(m => m.status === 'COMPLETED').length,
      unassigned: maintenance.filter(m => m.status === 'UNASSIGNED').length,
      assigned: maintenance.filter(m => m.status === 'ASSIGNED').length,
    };

    const applications = await prismaClient.application.findMany({
      where: { properties: { landlordId } }
    });

    const files = await prismaClient.propertyDocument.findMany({
      where: { properties: { landlordId } }
    });

    return {
      properties: {
        total: totalProperties,
        vacant,
        occupied,
      },
      cashFlow: {
        income,
        expenses,
        net: income - expenses
      },
      maintenance: maintenanceStats,
      applications: {
        total: applications.length,
        newApplicants: applications.filter(a => a.status !== ApplicationStatus.COMPLETED).length,
        existingApplicants: applications.filter(a => a.status === ApplicationStatus.COMPLETED).length,
      },
      incomeBreakdown: {
        rent: income,
        otherCharges: 0,
        tenantCharges: 0,
        latePayment: 2000 // example static for late fee
      },
      toDoList: [
        'Prepare for the Tenant Move-In',
        'Send an invite to Jane Austen',
        'Add a property'
      ],
    };
  }
}
export default new LandlordDashboardService()