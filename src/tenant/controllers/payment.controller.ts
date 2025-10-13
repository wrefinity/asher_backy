import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import transferServices from "../../services/transfer.services";
import walletService from "../../services/wallet.service";
import transactionServices from "../../services/transaction.services";
import { Currency, TransactionReference, TransactionType, TransactionStatus } from "@prisma/client";
import { prismaClient } from "../../index";
import { serverInstance } from "../../index";

class TenantPaymentController {
  constructor() {}

  // Pay a specific bill
  payBill = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { billId } = req.params;
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const { amount, paymentMethod = "wallet", walletId, paymentGateway } = req.body;

    if (!amount || amount <= 0) {
      throw ApiError.badRequest("Valid amount is required");
    }

    // Get the bill details
    const bill = await prismaClient.billsSubCategory.findFirst({
      where: {
        id: billId,
        tenantId: tenantId,
        isDeleted: false
      },
      include: {
        property: true,
        landlord: true,
        tenants: true
      }
    });

    if (!bill) {
      throw ApiError.notFound("Bill not found or you don't have access to it");
    }

    // Check if bill is already paid
    const existingTransaction = await prismaClient.transaction.findFirst({
      where: {
        reference: TransactionReference.BILL_PAYMENT,
        propertyId: bill.propertyId,
        userId: userId,
        metadata: {
          path: ["billId"],
          equals: billId
        }
      }
    });

    if (existingTransaction && existingTransaction.status === TransactionStatus.COMPLETED) {
      throw ApiError.badRequest("This bill has already been paid");
    }

    try {
      let paymentResult;

      if (paymentMethod === "wallet") {
        // Pay from wallet using existing transfer service
        paymentResult = await transferServices.payBill(
          {
            billType: TransactionReference.BILL_PAYMENT,
            amount,
            propertyId: bill.propertyId,
            billId: billId
          },
          tenantId,
          Currency.NGN // Default currency, can be made dynamic
        );
      } else {
        // External payment gateway (Stripe, Paystack, etc.)
        const wallet = await walletService.getUserWallet(userId, Currency.NGN);
        if (!wallet) {
          throw ApiError.notFound("Wallet not found");
        }

        // Create pending transaction first
        const pendingTransaction = await transactionServices.createTransaction({
          userId,
          amount,
          description: `Payment for bill: ${bill.billName}`,
          type: TransactionType.DEBIT,
          reference: TransactionReference.BILL_PAYMENT,
          status: TransactionStatus.PENDING,
          walletId: wallet.id,
          referenceId: `BILL-${Date.now()}-${billId}`,
          propertyId: bill.propertyId,
          metadata: { billId, paymentMethod, paymentGateway }
        });

        // Initialize payment with external gateway
        const paymentData = await walletService.fundWalletGeneral(
          userId,
          amount,
          Currency.NGN,
          "NG", // Default country code
          paymentGateway as any,
          paymentMethod
        );

        paymentResult = {
          transaction: pendingTransaction,
          paymentData,
          bill
        };
      }

      // Update bill status if paid from wallet
      if (paymentMethod === "wallet" && paymentResult) {
        await prismaClient.billsSubCategory.update({
          where: { id: billId },
          data: { 
            // Mark as paid by updating due date or adding a paid flag
            updatedAt: new Date()
          }
        });

        // Send payment success notification
        if (serverInstance.paymentNotificationService) {
          await serverInstance.paymentNotificationService.sendPaymentSuccessNotification(
            userId,
            billId,
            amount,
            bill.billName
          );
        }
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            paymentResult,
            bill: {
              id: bill.id,
              billName: bill.billName,
              amount: bill.amount,
              status: paymentMethod === "wallet" ? "paid" : "pending"
            }
          },
          "Bill payment initiated successfully"
        )
      );

    } catch (error) {
      console.error("Payment error:", error);
      
      // Send payment failure notification
      if (serverInstance.paymentNotificationService && userId && billId) {
        await serverInstance.paymentNotificationService.sendPaymentFailureNotification(
          userId,
          billId,
          amount,
          bill?.billName || 'Unknown Bill',
          error instanceof Error ? error.message : 'Payment failed'
        );
      }
      
      throw ApiError.internal("Payment failed. Please try again.");
    }
  });

  // Get payment history for tenant
  getPaymentHistory = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    const userId = req.user?.id;
    
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const { 
      page = "1", 
      limit = "10", 
      startDate, 
      endDate,
      type = "all"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build date filter
    const dateFilter = startDate || endDate ? {
      createdAt: {
        ...(startDate && { gte: new Date(startDate as string) }),
        ...(endDate && { lte: new Date(endDate as string) })
      }
    } : {};

    // Build transaction type filter
    const typeFilter = type !== "all" ? {
      reference: type === "bill" ? TransactionReference.BILL_PAYMENT : 
                 type === "maintenance" ? TransactionReference.MAINTENANCE_FEE :
                 type === "rent" ? TransactionReference.RENT_PAYMENT : undefined
    } : {};

    const transactions = await prismaClient.transaction.findMany({
      where: {
        userId,
        ...dateFilter,
        ...typeFilter,
        status: TransactionStatus.COMPLETED
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true
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
        ...dateFilter,
        ...typeFilter,
        status: TransactionStatus.COMPLETED
      }
    });

    return res.status(200).json(
      ApiResponse.success(
        {
          transactions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        },
        "Payment history retrieved successfully"
      )
    );
  });

  // Fund tenant wallet
  fundWallet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    const { amount, paymentGateway, currency = "NGN", countryCode = "NG" } = req.body;

    if (!amount || amount <= 0) {
      throw ApiError.badRequest("Valid amount is required");
    }

    if (!paymentGateway) {
      throw ApiError.badRequest("Payment gateway is required");
    }

    try {
      const result = await walletService.fundWalletGeneral(
        userId,
        amount,
        currency as Currency,
        countryCode,
        paymentGateway as any
      );

      return res.status(200).json(
        ApiResponse.success(result, "Wallet funding initiated successfully")
      );
    } catch (error) {
      console.error("Wallet funding error:", error);
      throw ApiError.internal("Wallet funding failed. Please try again.");
    }
  });

  // Get wallet balance
  getWalletBalance = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    const { currency = "NGN" } = req.query;

    try {
      const wallet = await walletService.getUserWallet(userId, currency as string);
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        const newWallet = await prismaClient.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: currency as string,
            isActive: true
          }
        });
        
        return res.status(200).json(
          ApiResponse.success(
            {
              balance: 0,
              currency: newWallet.currency,
              isActive: newWallet.isActive
            },
            "Wallet created successfully"
          )
        );
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            balance: wallet.balance,
            currency: wallet.currency,
            isActive: wallet.isActive
          },
          "Wallet balance retrieved successfully"
        )
      );
    } catch (error) {
      console.error("Wallet balance error:", error);
      throw ApiError.internal("Failed to retrieve wallet balance");
    }
  });

  // Get upcoming bills
  getUpcomingBills = asyncHandler(async (req: CustomRequest, res: Response) => {
    const tenantId = req.user?.tenant?.id;
    
    if (!tenantId) {
      throw ApiError.unauthorized("Unauthorized - Tenant ID missing");
    }

    const { days = "30" } = req.query;
    const daysAhead = parseInt(days as string);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingBills = await prismaClient.billsSubCategory.findMany({
      where: {
        tenantId,
        isDeleted: false,
        dueDate: {
          lte: futureDate,
          gte: new Date() // Only future bills
        },
        // Only bills that haven't been paid
        transactions: {
          none: {
            reference: TransactionReference.BILL_PAYMENT,
            status: TransactionStatus.COMPLETED
          }
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        bills: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    return res.status(200).json(
      ApiResponse.success(upcomingBills, "Upcoming bills retrieved successfully")
    );
  });
}

export default new TenantPaymentController();
