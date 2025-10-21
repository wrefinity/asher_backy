import { PrismaClient, Prisma } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

const prisma = new PrismaClient();

export class LandlordAnalyticsService {

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(landlordId: string, timeframe: string = '0-2 years') {
    const [cashFlow, properties, maintenance, incomeExpense, applications, files] = await Promise.all([
      this.getCashFlowAnalytics(landlordId, timeframe),
      this.getPropertiesAnalytics(landlordId),
      this.getMaintenanceAnalytics(landlordId),
      this.getIncomeExpenseAnalytics(landlordId),
      this.getApplicationsAnalytics(landlordId),
      this.getFilesAnalytics(landlordId)
    ]);

    return {
      cashFlow,
      properties,
      maintenance,
      incomeExpense,
      applications,
      files,
      todoList: await this.getTodoList(landlordId),
      calendar: await this.getCalendarEvents(landlordId)
    };
  }

  /**
   * Cash Flow Analytics - Main chart data
   */
  async getCashFlowAnalytics(landlordId: string, timeframe: string) {
    const dateRange = this.getDateRange(timeframe);

    const transactions = await prisma.transaction.findMany({
      where: {
        property: {
          landlordId: landlordId
        },
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        status: 'COMPLETED'
      },
      include: {
        property: true
      }
    });

    // Group by month for chart data
    const monthlyData = this.groupTransactionsByMonth(transactions, dateRange);

    const income = transactions
      .filter(t => t.type === 'CREDIT' &&
        (t.reference === 'RENT_PAYMENT' || t.reference === 'LATE_FEE' || t.reference === 'CHARGES'))
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const expenses = transactions
      .filter(t => t.type === 'DEBIT' &&
        (t.reference === 'MAINTENANCE_FEE' || t.reference === 'BILL_PAYMENT' || t.reference === 'SUPPLIES'))
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const net = income - expenses;

    return {
      chartData: monthlyData,
      summary: {
        income: this.formatCurrency(income),
        expenses: this.formatCurrency(expenses),
        net: this.formatCurrency(net)
      },
      raw: { income, expenses, net }
    };
  }

  /**
   * Properties Analytics
   */
  async getPropertiesAnalytics(landlordId: string) {
    const properties = await prisma.properties.findMany({
      where: {
        landlordId,
        isDeleted: false,
      },
      include: {
        tenants: {
          where: { isCurrentLease: true },
        },
        specification: {
          include: {
            residential: {
              include: {
                unitConfigurations: {
                  include: {
                    tenants: { where: { isCurrentLease: true } },
                  },
                },
                roomDetails: {
                  include: {
                    tenants: { where: { isCurrentLease: true } },
                  },
                },
              },
            },
            commercial: {
              include: {
                unitConfigurations: {
                  include: {
                    tenants: { where: { isCurrentLease: true } },
                  },
                },
                roomDetails: {
                  include: {
                    tenants: { where: { isCurrentLease: true } },
                  },
                },
              },
            },
            shortlet: {
              include: {
                roomDetails: {
                  include: {
                    tenants: { where: { isCurrentLease: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalOccupied = 0;
    let totalVacant = 0;

    for (const property of properties) {
      // property-level occupancy
      if (property.availability === "OCCUPIED" || property.tenants.length > 0) {
        totalOccupied++;
      } else {
        totalVacant++;
      }

      for (const spec of property.specification) {
        const res = spec.residential;
        const com = spec.commercial;
        const sh = spec.shortlet;

        if (res) {
          for (const unit of res.unitConfigurations) {
            if (unit.availability === "OCCUPIED" || unit.tenants.length > 0)
              totalOccupied++;
            else totalVacant++;
          }

          for (const room of res.roomDetails) {
            if (room.availability === "OCCUPIED" || room.tenants.length > 0)
              totalOccupied++;
            else totalVacant++;
          }
        }

        if (com) {
          for (const unit of com.unitConfigurations) {
            if (unit.availability === "OCCUPIED" || unit.tenants.length > 0)
              totalOccupied++;
            else totalVacant++;
          }

          for (const room of com.roomDetails) {
            if (room.availability === "OCCUPIED" || room.tenants.length > 0)
              totalOccupied++;
            else totalVacant++;
          }
        }

        if (sh) {
          for (const room of sh.roomDetails) {
            if (room.availability === "OCCUPIED" || room.tenants.length > 0)
              totalOccupied++;
            else totalVacant++;
          }
        }
      }
    }

    const totalProperties = totalOccupied + totalVacant;

    return {
      total: totalProperties,
      vacant: totalVacant,
      occupied: totalOccupied,
    };
  }



  /**
   * Maintenance Analytics
   */
  getMaintenanceAnalytics = async (landlordId: string) => {
    const maintenance = await prisma.maintenance.findMany({
      where: {
        property: {
          landlordId: landlordId
        },
        isDeleted: false
      },
      include: {
        category: true,
        property: true
      }
    });

    const statusCount = {
      inProgress: maintenance.filter(m => m.status === 'IN_PROGRESS').length,
      completed: maintenance.filter(m => m.status === 'COMPLETED').length,
      unassigned: maintenance.filter(m => m.status === 'UNASSIGNED').length,
      assigned: maintenance.filter(m => m.status === 'ASSIGNED').length,
      pending: maintenance.filter(m => m.status === 'PENDING').length
    };

    return {
      total: maintenance.length,
      ...statusCount,
      priorityBreakdown: await this.getMaintenancePriority(landlordId),
      recentTickets: maintenance
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          description: m.description,
          status: m.status,
          priority: this.determinePriority(m),
          createdAt: m.createdAt
        }))
    };
  }

  /**
   * Income & Expense Analytics
   */
  async getIncomeExpenseAnalytics(landlordId: string) {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const transactions = await prisma.transaction.findMany({
      where: {
        property: {
          landlordId: landlordId
        },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        },
        status: 'COMPLETED'
      }
    });

    const incomeBreakdown = {
      rent: transactions
        .filter(t => t.type === 'CREDIT' && t.reference === 'RENT_PAYMENT')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      otherCharges: transactions
        .filter(t => t.type === 'CREDIT' && t.reference === 'CHARGES')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      tenantCharges: transactions
        .filter(t => t.type === 'CREDIT' &&
          (t.reference === 'MAINTENANCE_FEE' || t.reference === 'BILL_PAYMENT'))
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      latePayment: transactions
        .filter(t => t.type === 'CREDIT' && t.reference === 'LATE_FEE')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0)
    };

    const expenseBreakdown = {
      maintenance: transactions
        .filter(t => t.type === 'DEBIT' && t.reference === 'MAINTENANCE_FEE')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      supplies: transactions
        .filter(t => t.type === 'DEBIT' && t.reference === 'SUPPLIES')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      equipment: transactions
        .filter(t => t.type === 'DEBIT' && t.reference === 'EQUIPMENTS')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),

      bills: transactions
        .filter(t => t.type === 'DEBIT' && t.reference === 'BILL_PAYMENT')
        .reduce((sum, t) => sum + t.amount.toNumber(), 0)
    };

    return {
      income: {
        total: Object.values(incomeBreakdown).reduce((sum, amount) => sum + amount, 0),
        breakdown: incomeBreakdown
      },
      expenses: {
        total: Object.values(expenseBreakdown).reduce((sum, amount) => sum + amount, 0),
        breakdown: expenseBreakdown
      },
      netCashFlow: Object.values(incomeBreakdown).reduce((sum, amount) => sum + amount, 0) -
        Object.values(expenseBreakdown).reduce((sum, amount) => sum + amount, 0)
    };
  }

  /**
   * Applications Analytics
   */
  async getApplicationsAnalytics(landlordId: string) {
    const applications = await prisma.application.findMany({
      where: {
        properties: {
          landlordId: landlordId
        },
        isDeleted: false
      },
      include: {
        properties: true,
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    const bookings = await prisma.booking.findMany({
      where: {
        property: {
          PropertySpecification: {
            some: {
              property: {
                propertyListingHistory: {
                  some: {
                    property: {
                      landlordId: landlordId
                    }
                  }
                }
              }
            }
          }
        }
      }
    });


    const newApplicants = applications.filter(app =>
      app.status === 'PENDING' || app.status === 'SUBMITTED'
    ).length;

    const existingApplicants = applications.filter(app =>
      app.status === 'APPROVED' || app.status === 'TENANT_CREATED'
    ).length;

    return {
      total: applications.length,
      newApplicants,
      existingApplicants,
      bookings: bookings.length,
      applications: applications.slice(0, 10).map(app => ({
        id: app.id,
        status: app.status,
        applicantName: app.user?.profile?.fullname || 'Unknown',
        property: app.properties?.name,
        submittedAt: app.createdAt
      }))
    };
  }

  /**
   * Files Storage Analytics
   */
  async getFilesAnalytics(landlordId: string) {
    // Calculate storage from property documents
    const documents = await prisma.propertyDocument.findMany({
      where: {
        properties: {
          landlordId: landlordId
        }
      },
      select: {
        size: true
      }
    });

    const totalBytes = documents.reduce((sum, doc) => sum + (Number(doc.size) || 0), 0);
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    const usedGB = Math.round(totalGB * 100) / 100; // Round to 2 decimal places
    const availableGB = 128.00 - usedGB; // Assuming 128GB total as per design

    return {
      totalGB: 128.00,
      usedGB,
      availableGB: Math.max(0, availableGB),
      usagePercentage: Math.round((usedGB / 128.00) * 100)
    };
  }

  /**
   * Todo List Items
   */
  async getTodoList(landlordId: string) {
    const pendingMaintenance = await prisma.maintenance.findMany({
      where: {
        property: {
          landlordId: landlordId
        },
        status: {
          in: ['PENDING', 'UNASSIGNED', 'ASSIGNED']
        },
        isDeleted: false
      },
      take: 5,
      include: {
        property: true
      }
    });

    const pendingApplications = await prisma.application.findMany({
      where: {
        properties: {
          landlordId: landlordId
        },
        status: 'PENDING',
        isDeleted: false
      },
      take: 3,
      include: {
        user: {
          include: {
            profile: true
          }
        },
        properties: true
      }
    });

    const todos = [
      ...pendingMaintenance.map(maintenance => ({
        id: maintenance.id,
        type: 'MAINTENANCE' as const,
        title: `Address maintenance: ${maintenance.description.substring(0, 50)}...`,
        property: maintenance.property.name,
        dueDate: maintenance.scheduleDate,
        priority: this.determinePriority(maintenance)
      })),
      ...pendingApplications.map(app => ({
        id: app.id,
        type: 'APPLICATION' as const,
        title: `Review application from ${app.user?.profile?.fullname || 'Applicant'}`,
        property: app.properties?.name,
        submittedAt: app.createdAt,
        priority: 'MEDIUM' as const
      })),
      {
        id: 'system-1',
        type: 'SYSTEM' as const,
        title: 'Prepare for Tenant Move-In',
        description: 'Ensure property is ready for new tenant',
        priority: 'HIGH' as const
      },
      {
        id: 'system-2',
        type: 'SYSTEM' as const,
        title: 'Add a property',
        description: 'List a new property in your portfolio',
        priority: 'MEDIUM' as const
      }
    ];

    return todos.sort((a, b) => {
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calendar Events
   */
  async getCalendarEvents(landlordId: string) {
    const currentDate = new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const [maintenance, applications, leaseRenewals] = await Promise.all([
      // Maintenance schedules
      prisma.maintenance.findMany({
        where: {
          property: {
            landlordId: landlordId
          },
          scheduleDate: {
            gte: monthStart,
            lte: monthEnd
          },
          isDeleted: false
        },
        include: {
          property: true
        }
      }),

      // Application move-in dates
      prisma.application.findMany({
        where: {
          properties: {
            landlordId: landlordId
          },
          moveInDate: {
            gte: monthStart,
            lte: monthEnd
          },
          isDeleted: false
        },
        include: {
          properties: true,
          user: {
            include: {
              profile: true
            }
          }
        }
      }),

      // Lease renewals
      prisma.leaseRenewal.findMany({
        where: {
          property: {
            landlordId: landlordId
          },
          proposedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        include: {
          property: true,
          tenant: true
        }
      })
    ]);

    const events = [
      ...maintenance.map(m => ({
        id: m.id,
        type: 'MAINTENANCE' as const,
        title: `Maintenance: ${m.property.name}`,
        date: m.scheduleDate,
        description: m.description
      })),
      ...applications.map(a => ({
        id: a.id,
        type: 'MOVE_IN' as const,
        title: `Move-in: ${a.user?.profile?.fullname || 'Tenant'}`,
        date: a.moveInDate,
        property: a.properties?.name
      })),
      ...leaseRenewals.map(l => ({
        id: l.id,
        type: 'LEASE_RENEWAL' as const,
        title: `Lease Renewal: ${l.tenant.tenantCode}`,
        date: l.proposedAt,
        property: l.property.name
      }))
    ];

    return events;
  }

  // Helper Methods

  private getDateRange(timeframe: string): { start: Date; end: Date } {
    const now = new Date();

    switch (timeframe) {
      case '0-2 years':
        return {
          start: startOfYear(subMonths(now, 24)),
          end: endOfMonth(now)
        };
      case '1 year':
        return {
          start: startOfYear(subMonths(now, 12)),
          end: endOfMonth(now)
        };
      case '6 months':
        return {
          start: startOfMonth(subMonths(now, 6)),
          end: endOfMonth(now)
        };
      case '3 months':
        return {
          start: startOfMonth(subMonths(now, 3)),
          end: endOfMonth(now)
        };
      case '1 month':
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }

  private groupTransactionsByMonth(transactions: any[], dateRange: { start: Date; end: Date }) {
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach(transaction => {
      const monthKey = transaction.createdAt.toISOString().substring(0, 7); // YYYY-MM

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      if (transaction.type === 'CREDIT') {
        monthlyData[monthKey].income += transaction.amount.toNumber();
      } else if (transaction.type === 'DEBIT') {
        monthlyData[monthKey].expenses += transaction.amount.toNumber();
      }
    });

    // Convert to array format for charting
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getMaintenancePriority(landlordId: string) {
    const maintenance = await prisma.maintenance.findMany({
      where: {
        property: {
          landlordId: landlordId
        },
        isDeleted: false
      }
    });

    const priorityCount = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    maintenance.forEach(m => {
      const priority = this.determinePriority(m);
      priorityCount[priority]++;
    });

    return priorityCount;
  }

  private determinePriority(maintenance: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    // Logic to determine priority based on maintenance data
    if (maintenance.status === 'IN_PROGRESS') return 'HIGH';
    if (maintenance.description?.toLowerCase().includes('emergency') ||
      maintenance.description?.toLowerCase().includes('urgent')) return 'HIGH';
    if (maintenance.status === 'PENDING' && maintenance.scheduleDate) {
      const daysUntilDue = Math.ceil(
        (new Date(maintenance.scheduleDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue <= 2) return 'HIGH';
      if (daysUntilDue <= 7) return 'MEDIUM';
    }
    return 'LOW';
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

// Export singleton instance
export const analyticsService = new LandlordAnalyticsService();