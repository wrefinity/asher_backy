import {
  Currency,
  PaymentGateway,
  TransactionReference,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';
import { prismaClient } from '..';
import stripeService from './stripe.service';
import paystackServices from './paystack.services';
import walletService from './wallet.service';
import { validateFundAmount } from '../utils/moneyAmount';
import { WEB_USER_PORTAL_URL } from '../secrets';
import {
  resolveApplicationFeeContext,
  selectApplicationFeeGateway,
  ApplicationFeeContext,
  assertApplicationFeeWithinHoldingCap,
} from '../utils/applicationFee.util';
import {
  calculateApplicationFeeRefundAmount,
  getApplicationFeeRefundInfo,
  resolveFinancialRules,
} from '../utils/globalSettings.util';
import LandlordSettingsService from '../landlord/services/propertySetting.service';
import { isWithinRefundTimeframe } from '../utils/settingsEnforcement.util';

const APPLICATION_FEE_INCLUDE = {
  applicationInvites: true,
  propertyListing: true,
  properties: {
    select: {
      id: true,
      price: true,
      priceFrequency: true,
      currency: true,
      country: true,
      landlordId: true,
      landlord: { select: { userId: true } },
    },
  },
  user: { select: { id: true, email: true } },
} as const;

class ApplicationFeeService {
  private async loadApplication(applicationId: string, userId?: string) {
    const application = await prismaClient.application.findFirst({
      where: {
        id: applicationId,
        isDeleted: false,
        ...(userId ? { userId } : {}),
      },
      include: APPLICATION_FEE_INCLUDE,
    });
    if (!application) {
      throw new Error('Application not found');
    }
    return application;
  }

  async getFeeStatus(applicationId: string, userId: string) {
    const application = await this.loadApplication(applicationId, userId);
    const context = await resolveApplicationFeeContext(application);
    const paid = await this.hasPaidApplicationFee(applicationId);

    return {
      ...context,
      paid,
      canComplete: !context.required || paid,
      gateway: selectApplicationFeeGateway(context.currency),
    };
  }

  async hasPaidApplicationFee(applicationId: string): Promise<boolean> {
    const paid = await prismaClient.transaction.findFirst({
      where: {
        applicationId,
        reference: TransactionReference.APPLICATION_FEE,
        status: TransactionStatus.COMPLETED,
        type: TransactionType.DEBIT,
      },
      select: { id: true },
    });
    return paid != null;
  }

  async assertCanComplete(applicationId: string): Promise<{
    ok: boolean;
    message?: string;
    fee?: ApplicationFeeContext;
  }> {
    const application = await prismaClient.application.findFirst({
      where: { id: applicationId, isDeleted: false },
      include: APPLICATION_FEE_INCLUDE,
    });
    if (!application) {
      return { ok: false, message: 'Application not found' };
    }

    const context = await resolveApplicationFeeContext(application);
    if (!context.required) {
      return { ok: true };
    }

    if (context.amount <= 0) {
      return {
        ok: false,
        message:
          'This application requires a fee, but the fee amount is not configured. Contact the landlord.',
        fee: context,
      };
    }

    const paid = await this.hasPaidApplicationFee(applicationId);
    if (!paid) {
      return {
        ok: false,
        message: 'Application fee payment is required before submitting.',
        fee: context,
      };
    }

    return { ok: true, fee: context };
  }

  async payFromWallet(applicationId: string, userId: string) {
    const application = await this.loadApplication(applicationId, userId);
    const context = await resolveApplicationFeeContext(application);

    const globalSettings = application.properties?.landlordId
      ? await LandlordSettingsService.getAllGlobalSettings(application.properties.landlordId)
      : null;
    const rules =
      globalSettings && application.properties?.price != null
        ? resolveFinancialRules(
            globalSettings,
            Number(application.properties.price),
            application.properties.priceFrequency
          )
        : null;
    await assertApplicationFeeWithinHoldingCap(application, rules, globalSettings);

    if (!context.required || context.amount <= 0) {
      throw new Error('No application fee is required for this application');
    }
    if (await this.hasPaidApplicationFee(applicationId)) {
      return { alreadyPaid: true, context };
    }
    if (!context.landlordUserId || !context.propertyId) {
      throw new Error('Unable to resolve landlord for this application fee');
    }

    const amount = validateFundAmount(context.amount, context.currency);
    const tenantWallet = await walletService.getOrCreateWallet(
      userId,
      context.currency
    );
    const landlordWallet = await walletService.getOrCreateWallet(
      context.landlordUserId,
      context.currency
    );

    await walletService.ensureSufficientBalance(
      tenantWallet.id,
      userId,
      new Decimal(amount)
    );

    const referenceBase = `APPFEE-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const tenantReferenceId = `${referenceBase}-tenant`;
    const landlordReferenceId = `${referenceBase}-landlord`;

    let alreadySettled = false;
    await prismaClient.$transaction(async (prisma) => {
      const existingPaid = await prisma.transaction.findFirst({
        where: {
          applicationId,
          reference: TransactionReference.APPLICATION_FEE,
          status: TransactionStatus.COMPLETED,
          type: TransactionType.DEBIT,
        },
        select: { id: true },
      });
      if (existingPaid) {
        alreadySettled = true;
        return;
      }

      await prisma.wallet.update({
        where: { id: tenantWallet.id },
        data: { balance: { decrement: amount } },
      });
      await prisma.wallet.update({
        where: { id: landlordWallet.id },
        data: { balance: { increment: amount } },
      });

      await prisma.transaction.create({
        data: {
          userId,
          walletId: tenantWallet.id,
          amount,
          currency: context.currency,
          description: `Application fee for application ${applicationId}`,
          type: TransactionType.DEBIT,
          reference: TransactionReference.APPLICATION_FEE,
          status: TransactionStatus.COMPLETED,
          referenceId: tenantReferenceId,
          propertyId: context.propertyId,
          applicationId,
          metadata: { paymentMethod: 'wallet' },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: context.landlordUserId!,
          walletId: landlordWallet.id,
          amount,
          currency: context.currency,
          description: `Application fee received for application ${applicationId}`,
          type: TransactionType.CREDIT,
          reference: TransactionReference.APPLICATION_FEE,
          status: TransactionStatus.COMPLETED,
          referenceId: landlordReferenceId,
          propertyId: context.propertyId,
          applicationId,
          metadata: { paymentMethod: 'wallet', tenantUserId: userId },
        },
      });
    });

    if (alreadySettled) {
      return { alreadyPaid: true, context, paymentMethod: 'wallet' as const };
    }

    return { paid: true, context, paymentMethod: 'wallet' as const };
  }

  private resolveApplicationFeeCallbackUrl(
    applicationId: string,
    clientCallbackUrl?: string
  ): string {
    if (typeof clientCallbackUrl === 'string' && clientCallbackUrl.trim()) {
      try {
        const parsed = new URL(clientCallbackUrl.trim());
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          return parsed.toString();
        }
      } catch {
        // fall through to default
      }
    }

    const base = WEB_USER_PORTAL_URL;
    return `${base}/dashboard/applications/payment-success?applicationId=${encodeURIComponent(applicationId)}&feeVerify=1`;
  }

  async initiateCardPayment(
    applicationId: string,
    userId: string,
    paymentGateway?: PaymentGateway,
    clientCallbackUrl?: string
  ) {
    const application = await this.loadApplication(applicationId, userId);
    const context = await resolveApplicationFeeContext(application);

    const globalSettings = application.properties?.landlordId
      ? await LandlordSettingsService.getAllGlobalSettings(application.properties.landlordId)
      : null;
    const rules =
      globalSettings && application.properties?.price != null
        ? resolveFinancialRules(
            globalSettings,
            Number(application.properties.price),
            application.properties.priceFrequency
          )
        : null;
    await assertApplicationFeeWithinHoldingCap(application, rules, globalSettings);

    if (!context.required || context.amount <= 0) {
      throw new Error('No application fee is required for this application');
    }
    if (await this.hasPaidApplicationFee(applicationId)) {
      return { alreadyPaid: true, context };
    }
    if (!context.landlordUserId || !context.propertyId) {
      throw new Error('Unable to resolve landlord for this application fee');
    }

    const amount = validateFundAmount(context.amount, context.currency);
    const expectedGateway = selectApplicationFeeGateway(
      context.currency
    ) as PaymentGateway;
    const gateway = paymentGateway || expectedGateway;
    if (gateway !== expectedGateway) {
      throw new Error(
        `Invalid payment gateway for ${context.currency}. Use ${expectedGateway}.`
      );
    }

    const referenceBase = `APPFEE-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const tenantReferenceId = `${referenceBase}-tenant`;
    const landlordReferenceId = `${referenceBase}-landlord`;

    const landlordWallet = await walletService.getOrCreateWallet(
      context.landlordUserId,
      context.currency
    );

    if (gateway === PaymentGateway.STRIPE) {
      const stripeCustomer = await stripeService.createOrGetStripeCustomer(userId);
      const paymentIntent = await stripeService.createPaymentIntent(
        userId,
        amount,
        context.currency,
        stripeCustomer.id,
        undefined,
        {
          purpose: TransactionReference.APPLICATION_FEE,
          applicationId,
          propertyId: context.propertyId,
          landlordUserId: context.landlordUserId,
          tenantReferenceId,
          landlordReferenceId,
          fundCurrency: context.currency,
          fundAmount: String(amount),
        }
      );

      await prismaClient.$transaction([
        prismaClient.transaction.create({
          data: {
            userId,
            amount,
            currency: context.currency,
            description: `Application fee for application ${applicationId}`,
            type: TransactionType.DEBIT,
            reference: TransactionReference.APPLICATION_FEE,
            status: TransactionStatus.PENDING,
            referenceId: tenantReferenceId,
            stripePaymentIntentId: paymentIntent.id,
            propertyId: context.propertyId,
            applicationId,
            paymentGateway: PaymentGateway.STRIPE,
            metadata: {
              paymentMethod: 'card',
              landlordReferenceId,
              landlordUserId: context.landlordUserId,
            },
          },
        }),
        prismaClient.transaction.create({
          data: {
            userId: context.landlordUserId,
            walletId: landlordWallet.id,
            amount,
            currency: context.currency,
            description: `Application fee pending for application ${applicationId}`,
            type: TransactionType.CREDIT,
            reference: TransactionReference.APPLICATION_FEE,
            status: TransactionStatus.PENDING,
            referenceId: landlordReferenceId,
            propertyId: context.propertyId,
            applicationId,
            paymentGateway: PaymentGateway.STRIPE,
            metadata: {
              paymentMethod: 'card',
              tenantReferenceId,
              tenantUserId: userId,
            },
          },
        }),
      ]);

      return {
        paid: false,
        context,
        paymentGateway: PaymentGateway.STRIPE,
        paymentDetails: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        amount,
        currency: context.currency,
      };
    }

    if (gateway === PaymentGateway.PAYSTACK) {
      const email = application.user?.email;
      if (!email) {
        throw new Error('User email is required for Paystack payments');
      }

      const paystackPayment = await paystackServices.initializePayment(
        userId,
        amount,
        context.currency as Currency,
        email,
        TransactionReference.APPLICATION_FEE,
        undefined,
        context.propertyId,
        {
          applicationId,
          landlordUserId: context.landlordUserId,
          tenantReferenceId,
          landlordReferenceId,
          fundCurrency: context.currency,
          fundAmount: String(amount),
          callbackUrl: this.resolveApplicationFeeCallbackUrl(
            applicationId,
            clientCallbackUrl
          ),
        }
      );

      await prismaClient.$transaction([
        prismaClient.transaction.create({
          data: {
            userId,
            amount,
            currency: context.currency,
            description: `Application fee for application ${applicationId}`,
            type: TransactionType.DEBIT,
            reference: TransactionReference.APPLICATION_FEE,
            status: TransactionStatus.PENDING,
            referenceId: paystackPayment.reference,
            propertyId: context.propertyId,
            applicationId,
            paymentGateway: PaymentGateway.PAYSTACK,
            metadata: {
              paymentMethod: 'card',
              landlordReferenceId,
              landlordUserId: context.landlordUserId,
              tenantReferenceId,
              paystackReference: paystackPayment.reference,
            },
          },
        }),
        prismaClient.transaction.create({
          data: {
            userId: context.landlordUserId,
            walletId: landlordWallet.id,
            amount,
            currency: context.currency,
            description: `Application fee pending for application ${applicationId}`,
            type: TransactionType.CREDIT,
            reference: TransactionReference.APPLICATION_FEE,
            status: TransactionStatus.PENDING,
            referenceId: landlordReferenceId,
            propertyId: context.propertyId,
            applicationId,
            paymentGateway: PaymentGateway.PAYSTACK,
            metadata: {
              paymentMethod: 'card',
              tenantReferenceId,
              tenantUserId: userId,
              paystackReference: paystackPayment.reference,
            },
          },
        }),
      ]);

      return {
        paid: false,
        context,
        paymentGateway: PaymentGateway.PAYSTACK,
        paymentUrl: paystackPayment.authorizationUrl,
        referenceId: paystackPayment.reference,
        amount,
        currency: context.currency,
      };
    }

    throw new Error(`Unsupported payment gateway: ${gateway}`);
  }

  async settleFromProviderReference(
    providerReference: string,
    paymentGateway: PaymentGateway,
    applicationId?: string
  ) {
    if (applicationId) {
      const pending = await prismaClient.transaction.findFirst({
        where: {
          applicationId,
          reference: TransactionReference.APPLICATION_FEE,
          type: TransactionType.DEBIT,
          OR: [
            { referenceId: providerReference },
            { stripePaymentIntentId: providerReference },
          ],
        },
      });
      if (!pending) {
        throw new Error('Payment reference does not match this application');
      }
    }

    if (paymentGateway === PaymentGateway.STRIPE) {
      const verified = await stripeService.verifyPaymentIntent(providerReference);
      if (!verified) {
        throw new Error('Stripe payment could not be verified');
      }
    } else if (paymentGateway === PaymentGateway.PAYSTACK) {
      await walletService.verifyPaystackPayment(providerReference);
    } else {
      throw new Error('Unsupported payment gateway');
    }

    return this.findCompletedFeeByProviderReference(
      providerReference,
      applicationId
    );
  }

  private async findCompletedFeeByProviderReference(
    providerReference: string,
    applicationId?: string
  ) {
    const paid = await prismaClient.transaction.findFirst({
      where: {
        reference: TransactionReference.APPLICATION_FEE,
        status: TransactionStatus.COMPLETED,
        type: TransactionType.DEBIT,
        ...(applicationId ? { applicationId } : {}),
        OR: [
          { referenceId: providerReference },
          { stripePaymentIntentId: providerReference },
        ],
      },
    });
    return { paid: paid != null, transaction: paid };
  }

  async settleApplicationFeePayment(params: {
    tenantReferenceId?: string;
    landlordReferenceId?: string;
    providerReference?: string;
    amount: number;
    currency: string;
    paymentGateway: PaymentGateway;
    stripePaymentIntentId?: string;
  }) {
    let tenantTx = params.tenantReferenceId
      ? await prismaClient.transaction.findFirst({
          where: { referenceId: params.tenantReferenceId },
        })
      : null;

    if (!tenantTx && params.providerReference) {
      tenantTx = await prismaClient.transaction.findFirst({
        where: {
          reference: TransactionReference.APPLICATION_FEE,
          type: TransactionType.DEBIT,
          OR: [
            { referenceId: params.providerReference },
            { stripePaymentIntentId: params.providerReference },
          ],
        },
      });
    }

    if (!tenantTx) {
      console.error('Application fee tenant transaction not found', params);
      return null;
    }

    if (tenantTx.status === TransactionStatus.COMPLETED) {
      return tenantTx;
    }

    const expectedAmount = Number(tenantTx.amount);
    if (
      Number.isFinite(expectedAmount) &&
      expectedAmount > 0 &&
      Math.abs(expectedAmount - params.amount) > 0.01
    ) {
      throw new Error('Settled amount does not match pending application fee');
    }

    const metadata = (tenantTx.metadata || {}) as Record<string, string>;
    const landlordReferenceId =
      params.landlordReferenceId || metadata.landlordReferenceId;
    const landlordUserId = metadata.landlordUserId;

    const landlordTx = landlordReferenceId
      ? await prismaClient.transaction.findFirst({
          where: { referenceId: landlordReferenceId },
        })
      : null;

    if (!landlordTx || !landlordUserId) {
      throw new Error('Unable to settle application fee — landlord transaction missing');
    }

    await prismaClient.$transaction(async (prisma) => {
      await prisma.transaction.update({
        where: { id: tenantTx!.id },
        data: {
          status: TransactionStatus.COMPLETED,
          amount: params.amount,
          currency: params.currency,
          stripePaymentIntentId: params.stripePaymentIntentId,
        },
      });

      if (landlordTx && landlordUserId) {
        const landlordWallet = await walletService.getOrCreateWallet(
          landlordUserId,
          params.currency as Currency
        );

        await prisma.wallet.update({
          where: { id: landlordWallet.id },
          data: { balance: { increment: params.amount } },
        });

        await prisma.transaction.update({
          where: { id: landlordTx.id },
          data: {
            status: TransactionStatus.COMPLETED,
            amount: params.amount,
            currency: params.currency,
            walletId: landlordWallet.id,
          },
        });
      }
    });

    return tenantTx;
  }

  async processRefundForRejectedApplication(params: {
    applicationId: string;
    propertyId: string;
    landlordId: string;
  }) {
    const paidTx = await prismaClient.transaction.findFirst({
      where: {
        applicationId: params.applicationId,
        reference: TransactionReference.APPLICATION_FEE,
        status: TransactionStatus.COMPLETED,
        type: TransactionType.DEBIT,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!paidTx) {
      return { refunded: false, reason: 'No completed application fee payment found' };
    }

    const existingRefund = await prismaClient.transaction.findFirst({
      where: {
        applicationId: params.applicationId,
        reference: TransactionReference.APPLICATION_FEE,
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        metadata: { path: ['refund'], equals: true },
      },
    });
    if (existingRefund) {
      return { refunded: false, reason: 'Refund already processed', transaction: existingRefund };
    }

    const property = await prismaClient.properties.findUnique({
      where: { id: params.propertyId },
      select: { price: true, priceFrequency: true, currency: true, landlord: { select: { userId: true } } },
    });
    if (!property?.landlord?.userId) {
      return { refunded: false, reason: 'Landlord not found for refund' };
    }

    const globalSettings = await LandlordSettingsService.getAllGlobalSettings(params.landlordId);
    const rules = resolveFinancialRules(
      globalSettings,
      Number(property.price ?? 0),
      property.priceFrequency
    );
    const refundInfo = getApplicationFeeRefundInfo(rules);
    if (!refundInfo.isRefundable) {
      return { refunded: false, reason: 'Application fee is non-refundable per landlord policy' };
    }

    if (!isWithinRefundTimeframe(paidTx.createdAt, rules.refundTimeframeDays)) {
      return {
        refunded: false,
        reason: `Refund window of ${rules.refundTimeframeDays} day(s) has passed`,
      };
    }

    const feePaid = Number(paidTx.amount);
    const refundAmount = calculateApplicationFeeRefundAmount(feePaid, rules);
    if (refundAmount <= 0) {
      return { refunded: false, reason: 'Calculated refund amount is zero' };
    }

    const currency = (paidTx.currency as Currency) || property.currency || Currency.GBP;
    const tenantUserId = paidTx.userId;
    const landlordUserId = property.landlord.userId;

    const tenantWallet = await walletService.getOrCreateWallet(tenantUserId, currency);
    const landlordWallet = await walletService.getOrCreateWallet(landlordUserId, currency);

    await walletService.ensureSufficientBalance(
      landlordWallet.id,
      landlordUserId,
      new Decimal(refundAmount)
    );

    const referenceBase = `APPFEE-REF-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const tenantReferenceId = `${referenceBase}-tenant`;
    const landlordReferenceId = `${referenceBase}-landlord`;

    await prismaClient.$transaction(async (prisma) => {
      await prisma.wallet.update({
        where: { id: landlordWallet.id },
        data: { balance: { decrement: refundAmount } },
      });
      await prisma.wallet.update({
        where: { id: tenantWallet.id },
        data: { balance: { increment: refundAmount } },
      });

      await prisma.transaction.create({
        data: {
          userId: tenantUserId,
          walletId: tenantWallet.id,
          amount: refundAmount,
          currency,
          description: `Application fee refund for application ${params.applicationId}`,
          type: TransactionType.CREDIT,
          reference: TransactionReference.APPLICATION_FEE,
          status: TransactionStatus.COMPLETED,
          referenceId: tenantReferenceId,
          propertyId: params.propertyId,
          applicationId: params.applicationId,
          metadata: {
            refund: true,
            originalReferenceId: paidTx.referenceId,
            refundPercent: refundInfo.refundPercent,
          },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: landlordUserId,
          walletId: landlordWallet.id,
          amount: refundAmount,
          currency,
          description: `Application fee refund issued for application ${params.applicationId}`,
          type: TransactionType.DEBIT,
          reference: TransactionReference.APPLICATION_FEE,
          status: TransactionStatus.COMPLETED,
          referenceId: landlordReferenceId,
          propertyId: params.propertyId,
          applicationId: params.applicationId,
          metadata: {
            refund: true,
            originalReferenceId: paidTx.referenceId,
            tenantUserId,
          },
        },
      });
    });

    return {
      refunded: true,
      refundAmount,
      currency,
      refundPercent: refundInfo.refundPercent,
    };
  }
}

export default new ApplicationFeeService();
