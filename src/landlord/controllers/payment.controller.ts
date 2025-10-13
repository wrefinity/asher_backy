import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { prismaClient } from '../..';
import { TransactionReference, TransactionStatus } from "@prisma/client";

class LandlordPaymentController {
  constructor() {}

  // Get bill payment status
  getBillPaymentStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { billId } = req.params;
    const landlordId = req.user?.landlords?.id;

    if (!landlordId) {
      throw ApiError.unauthorized("Unauthorized - Landlord ID missing");
    }

    // Get bill details with payment history
    const bill = await prismaClient.billsSubCategory.findFirst({
      where: {
        id: billId,
        landlordId: landlordId,
        isDeleted: false
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        tenants: {
          select: {
            id: true,
            tenantCode: true,
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullname: true,
                    phoneNumber: true
                  }
                }
              }
            }
          }
        },
        transactions: {
          where: {
            reference: TransactionReference.BILL_PAYMENT,
            status: TransactionStatus.COMPLETED
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullname: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!bill) {
      throw ApiError.notFound("Bill not found or you don't have access to it");
    }

    // Calculate payment status
    const totalPaid = bill.transactions.reduce((sum, transaction) => 
      sum + parseFloat(transaction.amount.toString()), 0
    );
    const remainingAmount = parseFloat(bill.amount.toString()) - totalPaid;
    const isFullyPaid = remainingAmount <= 0;
    const isOverdue = new Date() > bill.dueDate && !isFullyPaid;

    const paymentStatus = {
      billId: bill.id,
      billName: bill.billName,
      totalAmount: bill.amount,
      amountPaid: totalPaid,
      remainingAmount: Math.max(0, remainingAmount),
      dueDate: bill.dueDate,
      isFullyPaid,
      isOverdue,
      paymentProgress: Math.min(100, (totalPaid / parseFloat(bill.amount.toString())) * 100),
      lastPaymentDate: bill.transactions[0]?.createdAt || null,
      tenant: bill.tenants,
      property: bill.property,
      paymentHistory: bill.transactions
    };

    return res.status(200).json(
      ApiResponse.success(paymentStatus, "Bill payment status retrieved successfully")
    );
  });

  // Send payment reminder
  sendPaymentReminder = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { billId } = req.params;
    const landlordId = req.user?.landlords?.id;
    const { tenantId, reminderType = "email" } = req.body;

    if (!landlordId) {
      throw ApiError.unauthorized("Unauthorized - Landlord ID missing");
    }

    // Get bill and tenant details
    const bill = await prismaClient.billsSubCategory.findFirst({
      where: {
        id: billId,
        landlordId: landlordId,
        tenantId: tenantId,
        isDeleted: false
      },
      include: {
        tenants: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        property: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    if (!bill) {
      throw ApiError.notFound("Bill or tenant not found");
    }

    // Check if bill is already paid
    const isPaid = await prismaClient.transaction.findFirst({
      where: {
        reference: TransactionReference.BILL_PAYMENT,
        propertyId: bill.propertyId,
        userId: bill.tenants.userId,
        status: TransactionStatus.COMPLETED,
        metadata: {
          path: ["billId"],
          equals: billId
        }
      }
    });

    if (isPaid) {
      throw ApiError.badRequest("This bill has already been paid");
    }

    try {
      // TODO: Implement actual email/SMS sending service
      // For now, we'll just log the reminder
      console.log(`Payment reminder sent for bill ${billId} to tenant ${bill.tenants.user.email}`);
      
      // Create a log entry for the reminder
      await prismaClient.log.create({
        data: {
          events: `Payment reminder sent for bill: ${bill.billName}`,
          type: "ACTIVITY",
          propertyId: bill.propertyId,
          createdById: req.user.id
        }
      });

      return res.status(200).json(
        ApiResponse.success(
          {
            billId: bill.id,
            billName: bill.billName,
            tenantEmail: bill.tenants.user.email,
            reminderType,
            sentAt: new Date()
          },
          "Payment reminder sent successfully"
        )
      );
    } catch (error) {
      console.error("Payment reminder error:", error);
      throw ApiError.internal("Failed to send payment reminder");
    }
  });

  // Get received payments summary
  getReceivedPayments = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = req.user?.landlords?.id;
    const userId = req.user?.id;

    if (!landlordId) {
      throw ApiError.unauthorized("Unauthorized - Landlord ID missing");
    }

    const { 
      page = "1", 
      limit = "10", 
      startDate, 
      endDate,
      propertyId,
      type = "all"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const dateFilter = startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) })
      }
    } : {};

    const propertyFilter = propertyId ? { propertyId: propertyId as string } : {};

    const typeFilter = type !== "all" ? {
      reference: type === "bill" ? TransactionReference.BILL_PAYMENT : 
                 type === "rent" ? TransactionReference.RENT_PAYMENT :
                 type === "maintenance" ? TransactionReference.MAINTENANCE_FEE : undefined
    } : {};

    // Get received payments (CREDIT transactions to landlord)
    const receivedPayments = await prismaClient.transaction.findMany({
      where: {
        userId,
        type: "CREDIT",
        status: TransactionStatus.COMPLETED,
        ...dateFilter,
        ...propertyFilter,
        ...typeFilter
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullname: true,
                phoneNumber: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limitNum
    });

    const totalCount = await prismaClient.transaction.count({
      where: {
        userId,
        type: "CREDIT",
        status: TransactionStatus.COMPLETED,
        ...dateFilter,
        ...propertyFilter,
        ...typeFilter
      }
    });

    // Calculate summary statistics
    const totalReceived = await prismaClient.transaction.aggregate({
      where: {
        userId,
        type: "CREDIT",
        status: TransactionStatus.COMPLETED,
        ...dateFilter,
        ...propertyFilter
      },
      _sum: {
        amount: true
      }
    });

    const summary = {
      totalReceived: totalReceived._sum.amount || 0,
      totalTransactions: totalCount,
      averagePayment: totalCount > 0 ? parseFloat(totalReceived._sum.amount?.toString() || "0") / totalCount : 0
    };

    return res.status(200).json(
      ApiResponse.success(
        {
          payments: receivedPayments,
          summary,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        },
        "Received payments retrieved successfully"
      )
    );
  });

  // Get payment analytics
  getPaymentAnalytics = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = req.user?.landlords?.id;
    const userId = req.user?.id;

    if (!landlordId) {
      throw ApiError.unauthorized("Unauthorized - Landlord ID missing");
    }

    const { period = "30" } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get payment analytics for the specified period
    const analytics = await prismaClient.transaction.groupBy({
      by: ['reference', 'status'],
      where: {
        userId,
        type: "CREDIT",
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get monthly payment trends
    const monthlyTrends = await prismaClient.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        reference,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND type = 'CREDIT'
        AND status = 'COMPLETED'
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "createdAt"), reference
      ORDER BY month DESC
    `;

    return res.status(200).json(
      ApiResponse.success(
        {
          period: `${days} days`,
          analytics,
          monthlyTrends,
          generatedAt: new Date()
        },
        "Payment analytics retrieved successfully"
      )
    );
  });
}

export default new LandlordPaymentController();
