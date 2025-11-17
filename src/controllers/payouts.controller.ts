import { Request, Response } from 'express';
import { stripePayoutService } from '../services/stripe.payout.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { CustomRequest } from '../utils/types';


export class PayoutController {
  
  createPayout = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
      amount,
      currency,
      destination,
      description,
      metadata,
      connectedAccountId,
    } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Amount must be greater than 0');
    }
    if (!currency) {
      throw ApiError.badRequest('Currency is required');
    }
    if (!destination) {
      throw ApiError.badRequest('Destination (bank account) is required');
    }

    const payout = await stripePayoutService.createPayout(
      {
        amount,
        currency,
        destination,
        description,
        metadata,
        userId: req.user?.id!,
        vendorId: req.user?.vendors.id!
      },
      connectedAccountId
    );

    return res.status(201).json(
    ApiResponse.created(payout, 'Payout created successfully')
    );
  });


  getPayoutStatus = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { payoutId } = req.params;
    const { connectedAccountId } = req.query;
    const payout = await stripePayoutService.getPayoutStatus(
      payoutId,
      connectedAccountId as string | undefined
    );

    return res.json(
      new ApiResponse(200, payout, 'Payout retrieved successfully')
    );
  });


  listPayouts = asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
      limit = 10,
      status,
      startDate,
      endDate,
      connectedAccountId,
    } = req.query;

    const payouts = await stripePayoutService.listPayouts(
      {
        limit: Number(limit),
        status: status as any,
        created: {
          ...(startDate && { gte: Math.floor(new Date(startDate as string).getTime() / 1000) }),
          ...(endDate && { lte: Math.floor(new Date(endDate as string).getTime() / 1000) }),
        },
      },
      connectedAccountId as string | undefined
    );

    res.json(
      new ApiResponse(200, {
        payouts,
        count: payouts.length,
      }, 'Payouts retrieved successfully')
    );
  });

  /**
   * Cancel a payout
   * POST /api/payouts/:payoutId/cancel
   */
  cancelPayout = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { payoutId } = req.params;
    const { connectedAccountId } = req.body;

    const payout = await stripePayoutService.cancelPayout(
      payoutId,
      connectedAccountId
    );

    res.json(
      new ApiResponse(200, payout, 'Payout canceled successfully')
    );
  });

  /**
   * Reverse a payout
   * POST /api/payouts/:payoutId/reverse
   */
  reversePayout = asyncHandler(async (req: Request, res: Response) => {
    const { payoutId } = req.params;
    const { connectedAccountId } = req.body;

    const payout = await stripePayoutService.reversePayout(
      payoutId,
      connectedAccountId
    );

    res.json(
      new ApiResponse(200, payout, 'Payout reversed successfully')
    );
  });

  /**
   * Create bank account token
   * POST /api/payouts/bank-account/token
   */
  createBankAccountToken = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const {
        country,
        currency,
        account_holder_name,
        account_holder_type,
        account_number,
        routing_number,
        sort_code,
        branch_code,
      } = req.body;

      // Validation
      if (!country) throw ApiError.badRequest('Country is required');
      if (!currency) throw ApiError.badRequest('Currency is required');
      if (!account_holder_name)
        throw ApiError.badRequest('Account holder name is required');
      if (!account_number) throw ApiError.badRequest('Account number is required');

      const tokenId = await stripePayoutService.createBankAccountToken({
        country,
        currency,
        account_holder_name,
        account_holder_type,
        account_number,
        routing_number,
        sort_code,
        branch_code,
      });

      res.status(201).json(
        new ApiResponse(201, { tokenId }, 'Bank account token created')
      );
    }
  );


//   getPayoutSchedule = asyncHandler(async (req: Request, res: Response) => {
//     const { accountId } = req.params;

//     const schedule = await stripePayoutService.getPayoutSchedule(accountId);

//     res.json(
//       new ApiResponse(
//         200,
//         schedule,
//         'Payout schedule retrieved successfully'
//       )
//     );
//   });
}

export const payoutController = new PayoutController();