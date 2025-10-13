import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { prismaClient } from "../../index";
import { TransactionType, TransactionStatus, TransactionReference } from "@prisma/client";

class TenantFinancialAnalyticsController {
  constructor() {}

  // Get tenant financial dashboard overview
  getFinancialDashboard = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      // Get current month dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get wallet balance
      const wallet = await prismaClient.wallet.findFirst({
        where: { userId },
        select: { balance: true, currency: true }
      });

      // Get current month spending
      const monthlySpending = await prismaClient.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
      });

      // Get upcoming bills
      const upcomingBills = await prismaClient.billsSubCategory.findMany({
        where: {
          tenantId,
          payableBy: 'TENANT',
          isDeleted: false,
          dueDate: { gte: now }
        },
        select: {
          id: true,
          billName: true,
          amount: true,
          dueDate: true
        },
        orderBy: { dueDate: 'asc' },
        take: 3
      });

      // Get rent status
      const currentLease = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        select: {
          leaseStartDate: true,
          leaseEndDate: true,
          rentstatus: true,
          property: {
            select: {
              name: true,
              price: true
            }
          }
        }
      });

      // Get credit score
      const creditScore = await prismaClient.creditScore.findUnique({
        where: { userId },
        select: {
          score: true,
          paymentHistory: true,
          rentalHistory: true,
          maintainanceScore: true,
          reviewScore: true
        }
      });

      // Calculate rent status
      const isRentCurrent = currentLease?.rentstatus === 1;
      const nextRentDue = currentLease?.leaseEndDate;

      const dashboardData = {
        wallet: {
          balance: wallet?.balance || 0,
          currency: wallet?.currency || 'NGN'
        },
        spending: {
          currentMonth: Number(monthlySpending._sum.amount) || 0,
          currency: wallet?.currency || 'NGN'
        },
        upcomingBills: upcomingBills.map(bill => ({
          id: bill.id,
          name: bill.billName,
          amount: bill.amount,
          dueDate: bill.dueDate,
          daysUntilDue: Math.ceil((new Date(bill.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        })),
        rentStatus: {
          isCurrent: isRentCurrent,
          nextDue: nextRentDue,
          amount: currentLease?.property?.price || 0,
          propertyName: currentLease?.property?.name || 'Unknown Property'
        },
        creditScore: creditScore ? {
          score: creditScore.score,
          paymentHistory: creditScore.paymentHistory,
          rentalHistory: creditScore.rentalHistory,
          maintenanceScore: creditScore.maintainanceScore,
          reviewScore: creditScore.reviewScore
        } : null
      };

      return res.status(200).json(
        ApiResponse.success(dashboardData, "Financial dashboard data retrieved successfully")
      );

    } catch (error: any) {
      console.error("Error getting financial dashboard:", error);
      throw ApiError.internal("Failed to retrieve financial dashboard data");
    }
  });

  // Get spending analytics with trends
  getSpendingAnalytics = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    const { period = '6months' } = req.query;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case '12months':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      }

      // Get spending by category
      const spendingByCategory = await prismaClient.transaction.groupBy({
        by: ['reference'],
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } }
      });

      // Get monthly spending trends
      const monthlyTrends = await prismaClient.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM(amount) as total_spent,
          COUNT(*) as transaction_count
        FROM "Transaction"
        WHERE "userId" = ${userId}
          AND type = 'DEBIT'
          AND status = 'COMPLETED'
          AND "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `;

      // Get spending by payment method
      const spendingByMethod = await prismaClient.transaction.groupBy({
        by: ['paymentGateway'],
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      // Calculate total spending
      const totalSpending = await prismaClient.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      });

      const analyticsData = {
        period,
        totalSpending: Number(totalSpending._sum.amount) || 0,
        spendingByCategory: spendingByCategory.map(item => ({
          category: item.reference,
          amount: Number(item._sum.amount) || 0,
          count: item._count.id,
          percentage: 0 // Will calculate after we have total
        })),
        monthlyTrends: monthlyTrends as any[],
        spendingByMethod: spendingByMethod.map(item => ({
          method: item.paymentGateway || 'WALLET',
          amount: Number(item._sum.amount) || 0,
          count: item._count.id
        }))
      };

      // Calculate percentages
      const total = analyticsData.totalSpending;
      analyticsData.spendingByCategory.forEach(category => {
        category.percentage = total > 0 ? (category.amount / total) * 100 : 0;
      });

      return res.status(200).json(
        ApiResponse.success(analyticsData, "Spending analytics retrieved successfully")
      );

    } catch (error: any) {
      console.error("Error getting spending analytics:", error);
      throw ApiError.internal("Failed to retrieve spending analytics");
    }
  });

  // Get payment history
  getPaymentHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    const { 
      page = "1", 
      limit = "20", 
      type = "all",
      startDate,
      endDate,
      category
    } = req.query;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = {
        userId,
        status: TransactionStatus.COMPLETED
      };

      // Filter by transaction type
      if (type !== 'all') {
        whereClause.type = type === 'income' ? TransactionType.CREDIT : TransactionType.DEBIT;
      }

      // Filter by date range
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      // Filter by category
      if (category && category !== 'all') {
        whereClause.reference = category;
      }

      // Get transactions
      const transactions = await prismaClient.transaction.findMany({
        where: whereClause,
        include: {
          property: {
            select: { name: true, address: true }
          },
          billsSubCategory: {
            select: { billName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      });

      // Get total count
      const totalTransactions = await prismaClient.transaction.count({
        where: whereClause
      });

      // Get summary statistics
      const summary = await prismaClient.transaction.aggregate({
        where: {
          userId,
          status: TransactionStatus.COMPLETED,
          ...(startDate && endDate ? {
            createdAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          } : {})
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      const historyData = {
        transactions: transactions?.map(txn => ({
          id: txn.id,
          amount: txn.amount,
          type: txn.type,
          reference: txn.reference,
          description: txn.description,
          status: txn.status,
          paymentGateway: txn.paymentGateway,
          propertyName: txn.property?.name,
          billName: txn.billsSubCategory[0]?.billName,
          createdAt: txn.createdAt,
          currency: txn.currency
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalTransactions,
          pages: Math.ceil(totalTransactions / limitNum)
        },
        summary: {
          totalAmount: Number(summary._sum.amount) || 0,
          totalTransactions: summary._count.id
        }
      };

      return res.status(200).json(
        ApiResponse.success(historyData, "Payment history retrieved successfully")
      );

    } catch (error: any) {
      console.error("Error getting payment history:", error);
      throw ApiError.internal("Failed to retrieve payment history");
    }
  });

  // Get budget status and management
  getBudgetStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      // Get tenant's property
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        select: { propertyId: true }
      });

      if (!tenant) {
        throw ApiError.notFound("Tenant property not found");
      }

      // Get budgets for the property
      const budgets = await prismaClient.budget.findMany({
        where: { propertyId: tenant.propertyId },
        orderBy: { createdAt: 'desc' }
      });

      // Get current month spending by transaction type
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const currentMonthSpending = await prismaClient.transaction.groupBy({
        by: ['reference'],
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
      });

      // Map budgets with current spending
      const budgetStatus = budgets.map(budget => {
        const currentSpending = currentMonthSpending.find(
          spending => spending.reference === budget.transactionType
        );
        
        const spent = Number(currentSpending?._sum.amount) || 0;
        const budgetAmount = budget.budgetAmount;
        const utilization = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const remaining = budgetAmount - spent;
        const isOverBudget = spent > budgetAmount;
        const isNearLimit = utilization >= (budget.alertThreshold * 100);

        return {
          id: budget.id,
          transactionType: budget.transactionType,
          budgetAmount,
          currentAmount: spent,
          remaining,
          utilization,
          frequency: budget.frequency,
          alertThreshold: budget.alertThreshold * 100,
          isOverBudget,
          isNearLimit,
          createdAt: budget.createdAt
        };
      });

      return res.status(200).json(
        ApiResponse.success({
          budgets: budgetStatus,
          totalBudget: budgets.reduce((sum, budget) => sum + budget.budgetAmount, 0),
          totalSpent: currentMonthSpending.reduce((sum, spending) => sum + Number(spending._sum.amount || 0), 0)
        }, "Budget status retrieved successfully")
      );

    } catch (error: any) {
      console.error("Error getting budget status:", error);
      throw ApiError.internal("Failed to retrieve budget status");
    }
  });

  // Set or update budget
  setBudget = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    const { transactionType, budgetAmount, frequency, alertThreshold } = req.body;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      // Get tenant's property
      const tenant = await prismaClient.tenants.findUnique({
        where: { id: tenantId },
        select: { propertyId: true }
      });

      if (!tenant) {
        throw ApiError.notFound("Tenant property not found");
      }

      // Check if budget already exists for this transaction type
      const existingBudget = await prismaClient.budget.findFirst({
        where: {
          propertyId: tenant.propertyId,
          transactionType: transactionType as TransactionReference
        }
      });

      let budget;
      if (existingBudget) {
        // Update existing budget
        budget = await prismaClient.budget.update({
          where: { id: existingBudget.id },
          data: {
            budgetAmount,
            frequency: frequency as any,
            alertThreshold: (alertThreshold || 0.8)
          }
        });
      } else {
        // Create new budget
        budget = await prismaClient.budget.create({
          data: {
            propertyId: tenant.propertyId,
            transactionType: transactionType as TransactionReference,
            budgetAmount,
            currentAmount: 0,
            frequency: frequency as any,
            alertThreshold: (alertThreshold || 0.8)
          }
        });
      }

      return res.status(200).json(
        ApiResponse.success(budget, "Budget set successfully")
      );

    } catch (error: any) {
      console.error("Error setting budget:", error);
      throw ApiError.internal("Failed to set budget");
    }
  });

  // Get financial health insights
  getFinancialHealth = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      throw ApiError.unauthorized("Unauthorized - Tenant or User ID missing");
    }

    try {
      // Get credit score
      const creditScore = await prismaClient.creditScore.findUnique({
        where: { userId },
        select: {
          score: true,
          paymentHistory: true,
          rentalHistory: true,
          maintainanceScore: true,
          reviewScore: true,
          lastUpdated: true
        }
      });

      // Get payment reliability (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const totalPayments = await prismaClient.transaction.count({
        where: {
          userId,
          type: TransactionType.DEBIT,
          createdAt: { gte: sixMonthsAgo }
        }
      });

      const onTimePayments = await prismaClient.transaction.count({
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: sixMonthsAgo }
        }
      });

      const paymentReliability = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;

      // Get recent spending trends
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const lastMonthSpending = await prismaClient.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { 
            gte: lastMonth,
            lt: currentMonth
          }
        },
        _sum: { amount: true }
      });

      const currentMonthSpending = await prismaClient.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.COMPLETED,
          createdAt: { gte: currentMonth }
        },
        _sum: { amount: true }
      });

      const lastMonthTotal = Number(lastMonthSpending._sum.amount) || 0;
      const currentMonthTotal = Number(currentMonthSpending._sum.amount) || 0;
      const spendingTrend = lastMonthTotal > 0 ? 
        ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

      // Generate insights and tips
      const insights = [];
      const tips = [];

      if (creditScore?.score) {
        if (creditScore.score >= 750) {
          insights.push("Excellent credit score! Keep up the great work.");
        } else if (creditScore.score >= 650) {
          insights.push("Good credit score. Consider improving payment timing.");
          tips.push("Pay bills a few days before due date to improve credit score.");
        } else {
          insights.push("Credit score needs improvement. Focus on consistent payments.");
          tips.push("Set up automatic payments to avoid late fees and improve credit score.");
        }
      }

      if (paymentReliability >= 95) {
        insights.push("Outstanding payment reliability! You're a model tenant.");
      } else if (paymentReliability >= 85) {
        insights.push("Good payment reliability. Small improvements possible.");
        tips.push("Set calendar reminders for bill due dates.");
      } else {
        insights.push("Payment reliability needs attention.");
        tips.push("Consider setting up automatic payments for recurring bills.");
      }

      if (spendingTrend > 20) {
        insights.push("Spending has increased significantly this month.");
        tips.push("Review your budget and identify areas to reduce spending.");
      } else if (spendingTrend < -10) {
        insights.push("Great job! Spending has decreased this month.");
      }

      // Check for upcoming bills
      const upcomingBills = await prismaClient.billsSubCategory.count({
        where: {
          tenantId,
          payableBy: 'TENANT',
          isDeleted: false,
          dueDate: { 
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        }
      });

      if (upcomingBills > 0) {
        tips.push(`${upcomingBills} bills due in the next 7 days. Plan your payments accordingly.`);
      }

      const healthData = {
        creditScore: creditScore ? {
          score: creditScore.score,
          paymentHistory: creditScore.paymentHistory,
          rentalHistory: creditScore.rentalHistory,
          maintenanceScore: creditScore.maintainanceScore,
          reviewScore: creditScore.reviewScore,
          lastUpdated: creditScore.lastUpdated
        } : null,
        paymentReliability: {
          percentage: paymentReliability,
          onTimePayments,
          totalPayments,
          period: '6months'
        },
        spendingTrend: {
          percentage: spendingTrend,
          lastMonth: lastMonthTotal,
          currentMonth: currentMonthTotal,
          trend: spendingTrend > 0 ? 'increasing' : spendingTrend < 0 ? 'decreasing' : 'stable'
        },
        insights,
        tips
      };

      return res.status(200).json(
        ApiResponse.success(healthData, "Financial health data retrieved successfully")
      );

    } catch (error: any) {
      console.error("Error getting financial health:", error);
      throw ApiError.internal("Failed to retrieve financial health data");
    }
  });
}

export default new TenantFinancialAnalyticsController();
