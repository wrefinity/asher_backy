import Stripe from 'stripe';
import logger from '../utils/loggers';
import { ApiError } from '../utils/ApiError';
import { prismaClient } from '..';
import { TransactionReference, PaymentGateway, PayoutStatus, TransactionStatus, TransactionType } from "@prisma/client"
import transaction from '../routes/transaction';
import transactionServices from './transaction.services';
import { Decimal } from '@prisma/client/runtime/library';
import { generateIDs } from '../utils/helpers';


interface PayoutRequest {
  amount: number; // in cents (e.g., 10000 for $100)
  currency: string; // 'usd', 'ngn', etc
  destination: string; // Bank account ID or card ID
  description?: string;
  metadata?: Record<string, string>;
  userId: string;
  vendorId: string;
}

interface PayoutResponse {
  id: string;
  object: string;
  amount: number;
  arrival_date: number;
  automatic: boolean;
  balance_transaction: string;
  created: number;
  currency: string;
  description?: string;
  destination: string;
  failure_balance_transaction?: string;
  failure_code?: string;
  failure_message?: string;
  livemode: boolean;
  method: string;
  original_payout?: string;
  reversed_by?: string;
  source_type: string;
  statement_descriptor?: string;
  status: 'succeeded' | 'pending' | 'in_transit' | 'canceled' | 'failed';
  type: string;
}

export class StripePayoutService {
  private stripe: Stripe;
  private readonly STRIPE_API_KEY: string;

  constructor() {
    this.STRIPE_API_KEY = process.env.STRIPE_SECRET_KEY || '';

    if (!this.STRIPE_API_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    this.stripe = new Stripe(this.STRIPE_API_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Create a payout to a connected account's bank account
   */
  async createPayout(
    request: PayoutRequest,
    connectedAccountId?: string
  ): Promise<PayoutResponse> {
    try {
      logger.info(
        `[Stripe Payout] Creating payout: ${request.amount} ${request.currency} to ${request.destination}`
      );

      // const payoutParams: Stripe.PayoutCreateParams = {
      //   amount: request.amount,
      //   currency: request.currency.toLowerCase(),
      //   destination: request.destination,
      //   description: request.description,
      //   metadata: request.metadata,
      // };


      // 3. Get bank account details
      const bankAccount = await prismaClient.bankInfo.findFirst({
        where: { vendorId: request.vendorId },
      });

      if (!bankAccount) {
        throw ApiError.notFound('Bank account not found');
      }

      if (bankAccount.vendorId !== request.vendorId) {
        throw ApiError.badRequest('Bank account does not belong to this user');
      }

      // create transactions
      const transaction = await transactionServices.createTransaction(
        {
          description: "Vendor Payout",
          amount: Math.round(request.amount * 100), // Convert to cents
          currency: bankAccount?.currency.toString().toLowerCase() || "usd",
          userId: request.userId,
          type: TransactionType.CREDIT,
          status: TransactionStatus.PENDING,
          paymentGateway: PaymentGateway.STRIPE,
          reference: TransactionReference.PAYOUT,
          referenceId: generateIDs(`RF`),
        }
      );

      
      const payoutParams: Stripe.PayoutCreateParams = {
        amount: Math.round(request.amount * 100),
        currency: bankAccount.currency.toLowerCase(),
        destination: bankAccount.stripeTokenId,
        description: request.description || `Payout for vendors transactions`,
        metadata: {
          vendorId: request.vendorId,
          transactionId: transaction.id,
          ...request.metadata,
          // Add required fields
          userId: request.userId,
          bankAccountId: bankAccount.id
        },
      }


      let payout: Stripe.Payout;

      // If using connected account (for marketplace platforms)
      if (connectedAccountId) {
        payout = await this.stripe.payouts.create(payoutParams, {
          stripeAccount: connectedAccountId,
        });
      } else {
        payout = await this.stripe.payouts.create(payoutParams);
      }

      await prismaClient.payout.create({
        data: {
          stripePayoutId: payout.id,
          vendorId: request.vendorId,
          amount: new Decimal(request.amount),
          currency: bankAccount.currency,
          destination: payout.destination.toString(),
          status: PayoutStatus.PENDING,
          description: request.description,
          arrivalDate: payout.arrival_date
            ? new Date(payout.arrival_date * 1000)
            : null,
          method: payout.method,
          sourceType: payout.source_type,
          automatic: payout.automatic,
          livemode: payout.livemode,
          metadata: payout.metadata,
        },
      });

      logger.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'PAYOUT_CREATED',
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          destination: payout.destination,
        })
      );

      return this.formatPayoutResponse(payout);
    } catch (error: any) {
      logger.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'PAYOUT_FAILED',
          error: error.message,
          errorCode: error.code,
          requestParams: request,
        })
      );

      throw ApiError.internal(
        `Failed to create payout: ${error.message}`
      );
    }
  }

  /**
   * Retrieve payout status
   */
  async getPayoutStatus(
    payoutId: string,
    connectedAccountId?: string
  ): Promise<PayoutResponse> {
    try {
      logger.info(`[Stripe Payout] Retrieving payout: ${payoutId}`);

      let payout: Stripe.Payout;

      if (connectedAccountId) {
        payout = await this.stripe.payouts.retrieve(payoutId, {
          stripeAccount: connectedAccountId,
        });
      } else {
        payout = await this.stripe.payouts.retrieve(payoutId);
      }

      logger.info(
        `[Stripe Payout] Payout ${payoutId} status: ${payout.status}`
      );

      return this.formatPayoutResponse(payout);
    } catch (error: any) {
      logger.error(
        `[Stripe Payout] Failed to retrieve payout ${payoutId}: ${error.message}`
      );

      throw ApiError.notFound(`Payout not found: ${payoutId}`);
    }
  }

  /**
   * List all payouts with optional filters
   */
  async listPayouts(
    options?: {
      limit?: number;
      status?: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
      created?: {
        gte?: number;
        lte?: number;
      };
    },
    connectedAccountId?: string
  ): Promise<PayoutResponse[]> {
    try {
      logger.info('[Stripe Payout] Listing payouts');

      const listParams: Stripe.PayoutListParams = {
        limit: options?.limit || 10,
        ...(options?.status && { status: options.status }),
        ...(options?.created && { created: options.created }),
      };

      let payouts: Stripe.ApiList<Stripe.Payout>;

      if (connectedAccountId) {
        payouts = await this.stripe.payouts.list(listParams, {
          stripeAccount: connectedAccountId,
        });
      } else {
        payouts = await this.stripe.payouts.list(listParams);
      }

      logger.info(`[Stripe Payout] Retrieved ${payouts.data.length} payouts`);

      return payouts.data.map((payout) => this.formatPayoutResponse(payout));
    } catch (error: any) {
      logger.error(
        `[Stripe Payout] Failed to list payouts: ${error.message}`
      );

      throw ApiError.internal('Failed to retrieve payouts');
    }
  }

  /**
   * Cancel a pending payout
   */
  async cancelPayout(
    payoutId: string,
    connectedAccountId?: string
  ): Promise<PayoutResponse> {
    try {
      logger.info(`[Stripe Payout] Canceling payout: ${payoutId}`);

      let payout: Stripe.Payout;

      if (connectedAccountId) {
        payout = await this.stripe.payouts.cancel(payoutId, {
          stripeAccount: connectedAccountId,
        });
      } else {
        payout = await this.stripe.payouts.cancel(payoutId);
      }

      logger.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'PAYOUT_CANCELED',
          payoutId: payout.id,
          status: payout.status,
        })
      );

      return this.formatPayoutResponse(payout);
    } catch (error: any) {
      logger.error(
        `[Stripe Payout] Failed to cancel payout ${payoutId}: ${error.message}`
      );

      throw ApiError.badRequest(
        `Cannot cancel payout: ${error.message}`
      );
    }
  }

  /**
   * Reverse a paid-out payout (creates a reversal)
   */
  async reversePayout(
    payoutId: string,
    connectedAccountId?: string
  ): Promise<PayoutResponse> {
    try {
      logger.info(`[Stripe Payout] Reversing payout: ${payoutId}`);

      let payout: Stripe.Payout;

      if (connectedAccountId) {
        payout = await this.stripe.payouts.reverse(payoutId, {
          stripeAccount: connectedAccountId,
        });
      } else {
        payout = await this.stripe.payouts.reverse(payoutId);
      }

      logger.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'PAYOUT_REVERSED',
          payoutId: payout.id,
          status: payout.status,
        })
      );

      return this.formatPayoutResponse(payout);
    } catch (error: any) {
      logger.error(
        `[Stripe Payout] Failed to reverse payout ${payoutId}: ${error.message}`
      );

      throw ApiError.badRequest(
        `Cannot reverse payout: ${error.message}`
      );
    }
  }

  /**
   * Create a bank account token for payout destination
   */
  async createBankAccountToken(
    bankAccount: {
      country: string;
      currency: string;
      account_holder_name: string;
      account_holder_type: 'individual' | 'company';
      account_number: string;
      routing_number?: string; // For US accounts
      sort_code?: string; // For UK accounts
      branch_code?: string; // For other countries
    }
  ): Promise<string> {
    try {
      logger.info(
        `[Stripe Payout] Creating bank account token for ${bankAccount.account_holder_name}`
      );

      const token = await this.stripe.tokens.create({
        bank_account: {
          country: bankAccount.country,
          currency: bankAccount.currency,
          account_holder_name: bankAccount.account_holder_name,
          account_holder_type: bankAccount.account_holder_type,
          account_number: bankAccount.account_number,
          routing_number: bankAccount.routing_number,
        },
      });

      logger.info(`[Stripe Payout] Bank account token created: ${token.id}`);

      return token.id;
    } catch (error: any) {
      logger.error(
        `[Stripe Payout] Failed to create bank account token: ${error.message}`
      );

      throw ApiError.badRequest(
        `Invalid bank account details: ${error.message}`
      );
    }
  }

  /**
   * Estimate payout arrival (based on payout schedule)
   */
  // async getPayoutSchedule(
  //   connectedAccountId: string
  // ): Promise<any> {
  //   try {
  //     logger.info(
  //       `[Stripe Payout] Fetching payout schedule for account: ${connectedAccountId}`
  //     );

  //     const account = await this.stripe.accounts.retrieve(
  //       connectedAccountId
  //     );

  //     const payoutSchedule = {
  //       interval: account.payout_schedule?.interval || 'daily',
  //       anchor: account.payout_schedule?.anchor || 0,
  //       delay_days: account.payout_schedule?.delay_days || 2,
  //     };

  //     logger.info(
  //       `[Stripe Payout] Payout schedule: ${JSON.stringify(payoutSchedule)}`
  //     );

  //     return payoutSchedule;
  //   } catch (error: any) {
  //     logger.error(
  //       `[Stripe Payout] Failed to fetch payout schedule: ${error.message}`
  //     );

  //     throw ApiError.notFound('Account not found');
  //   }
  // }

  /**
   * Format Stripe payout response
   */
  private formatPayoutResponse(payout: Stripe.Payout): PayoutResponse {

    const toStringSafe = (value: any): string => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      // Stripe returns objects: extract id if it exists
      if (typeof value === 'object' && value.id) return value.id;
      return String(value);
    };

    return {
      id: payout.id,
      object: payout.object,
      amount: payout.amount,
      arrival_date: payout.arrival_date,
      automatic: payout.automatic,

      // FIXED: always string
      balance_transaction: toStringSafe(payout.balance_transaction),

      created: payout.created,
      currency: payout.currency,
      description: payout.description || undefined,

      // FIXED: always string
      destination: toStringSafe(payout.destination),

      // FIXED: always string
      failure_balance_transaction: payout.failure_balance_transaction
        ? toStringSafe(payout.failure_balance_transaction)
        : undefined,

      failure_code: payout.failure_code || undefined,
      failure_message: payout.failure_message || undefined,
      livemode: payout.livemode,
      method: payout.method,
      original_payout: payout.original_payout
        ? toStringSafe(payout.original_payout)
        : undefined,

      reversed_by: payout.reversed_by
        ? toStringSafe(payout.reversed_by)
        : undefined,
      source_type: payout.source_type,
      statement_descriptor: payout.statement_descriptor || undefined,
      status: payout.status as 'succeeded' | 'pending' | 'in_transit' | 'canceled' | 'failed',
      type: payout.type,
    };
  }

}

// Export singleton instance
export const stripePayoutService = new StripePayoutService();