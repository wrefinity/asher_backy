
import { ApplicationStatus, maintenanceStatus, TransactionType, TransactionReference } from "@prisma/client";
import { prismaClient } from "../..";
import todosService from "../../services/todos.service";
class LandlordDashboardService {

  async getDashboardData(landlordId: string, filters: any, accountUserId: string) {
    const properties = await prismaClient.properties.findMany({
      where: { landlordId, isDeleted: false },
      select: { id: true, availability: true },
    });

    const totalProperties = properties.length;
    const vacant = properties.filter(p => p.availability === 'VACANT').length;
    const occupied = totalProperties - vacant;

    const transactions = await prismaClient.transaction.findMany({
      where: {
        userId: accountUserId,
        property: { landlordId },
        createdAt: filters?.from && filters?.to ? {
          gte: new Date(filters.from),
          lte: new Date(filters.to),
        } : undefined
      },
    });

    const creditTransactions = transactions.filter(t => t.type === TransactionType.CREDIT);
    const income = creditTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === TransactionType.DEBIT).reduce((sum, t) => sum + Number(t.amount), 0);
    const rentIncome = creditTransactions
      .filter(t => t.reference === TransactionReference.RENT_PAYMENT)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const otherCharges = creditTransactions
      .filter(t => t.reference === TransactionReference.CHARGES)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const tenantCharges = creditTransactions
      .filter(t =>
        t.reference === TransactionReference.MAINTENANCE_FEE ||
        t.reference === TransactionReference.BILL_PAYMENT
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const latePaymentFees = creditTransactions
      .filter(t => t.reference === TransactionReference.LATE_FEE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const maintenance = await prismaClient.maintenance.findMany({
      where: { property: { landlordId } },
      select: { status: true }
    });

    const maintenanceStats = {
      total: maintenance.length,
      inProgress: maintenance.filter(m => m.status === maintenanceStatus.PENDING).length,
      completed: maintenance.filter(m => m.status === maintenanceStatus.COMPLETED).length,
      unassigned: maintenance.filter(m => m.status === maintenanceStatus.UNASSIGNED).length,
      assigned: maintenance.filter(m => m.status === maintenanceStatus.ASSIGNED).length,
    };

    const applications = await prismaClient.application.findMany({
      where: { properties: { landlordId } }
    });

    const files = await prismaClient.propertyDocument.findMany({
      where: {
        deletedAt: null,
        purgedAt: null,
        properties: { landlordId },
      }
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
        rent: rentIncome || income,
        otherCharges,
        tenantCharges,
        latePayment: latePaymentFees,
      },
      toDoList: todosService.getLandlordTodo(landlordId),
    };
  }
}
export default new LandlordDashboardService()