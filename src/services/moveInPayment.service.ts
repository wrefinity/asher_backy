import {
  ApplicationStatus,
  TransactionReference,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';
import { prismaClient } from '..';
import walletService from './wallet.service';
import { validateFundAmount } from '../utils/moneyAmount';
import { resolveMoveInPaymentContext } from '../utils/moveInPayment.util';

const MOVE_IN_INCLUDE = {
  applicationInvites: {
    select: {
      properties: {
        select: {
          id: true,
          price: true,
          rentalFee: true,
          securityDeposit: true,
          initialDeposit: true,
          currency: true,
          landlord: { select: { userId: true } },
        },
      },
    },
  },
  propertyListing: {
    select: {
      price: true,
      securityDeposit: true,
      propertyId: true,
      property: {
        select: {
          id: true,
          price: true,
          rentalFee: true,
          securityDeposit: true,
          initialDeposit: true,
          currency: true,
          landlord: { select: { userId: true } },
        },
      },
    },
  },
  properties: {
    select: {
      id: true,
      price: true,
      rentalFee: true,
      securityDeposit: true,
      initialDeposit: true,
      currency: true,
      landlordId: true,
      landlord: { select: { userId: true } },
    },
  },
} as const;

class MoveInPaymentService {
  private async loadApplication(applicationId: string, userId?: string) {
    const application = await prismaClient.application.findFirst({
      where: {
        id: applicationId,
        isDeleted: false,
        ...(userId ? { userId } : {}),
      },
      include: MOVE_IN_INCLUDE,
    });
    if (!application) {
      throw new Error('Application not found');
    }
    return application;
  }

  async hasPaidMoveInPayment(applicationId: string): Promise<boolean> {
    const paid = await prismaClient.transaction.findFirst({
      where: {
        applicationId,
        reference: TransactionReference.MAKE_PAYMENT,
        status: TransactionStatus.COMPLETED,
        type: TransactionType.DEBIT,
      },
      select: { id: true },
    });
    return paid != null;
  }

  async getPaymentStatus(applicationId: string, userId: string) {
    const application = await this.loadApplication(applicationId, userId);
    const context = resolveMoveInPaymentContext(application);
    const paid = await this.hasPaidMoveInPayment(applicationId);

    return {
      ...context,
      paid,
      canPay: context.required && !paid,
    };
  }

  async payFromWallet(applicationId: string, userId: string) {
    const application = await this.loadApplication(applicationId, userId);
    const context = resolveMoveInPaymentContext(application);

    if (String(application.status).toUpperCase() !== ApplicationStatus.MAKEPAYMENT) {
      throw new Error('Move-in payment is not required for this application');
    }
    if (!context.required || context.totalAmount <= 0) {
      throw new Error('No move-in payment is required for this application');
    }
    if (await this.hasPaidMoveInPayment(applicationId)) {
      return { alreadyPaid: true, context };
    }
    if (!context.landlordUserId || !context.propertyId) {
      throw new Error('Unable to resolve landlord for this payment');
    }

    const amount = validateFundAmount(context.totalAmount, context.currency);
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

    const referenceBase = `MOVEIN-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const tenantReferenceId = `${referenceBase}-tenant`;
    const landlordReferenceId = `${referenceBase}-landlord`;

    let alreadySettled = false;
    await prismaClient.$transaction(async (prisma) => {
      const existingPaid = await prisma.transaction.findFirst({
        where: {
          applicationId,
          reference: TransactionReference.MAKE_PAYMENT,
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
          description: `Move-in payment (deposit + rent) for application ${applicationId}`,
          type: TransactionType.DEBIT,
          reference: TransactionReference.MAKE_PAYMENT,
          status: TransactionStatus.COMPLETED,
          referenceId: tenantReferenceId,
          propertyId: context.propertyId,
          applicationId,
          metadata: {
            paymentMethod: 'wallet',
            rentAmount: context.rentAmount,
            depositAmount: context.depositAmount,
          },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: context.landlordUserId!,
          walletId: landlordWallet.id,
          amount,
          currency: context.currency,
          description: `Move-in payment received for application ${applicationId}`,
          type: TransactionType.CREDIT,
          reference: TransactionReference.RECEIVE_PAYMENT,
          status: TransactionStatus.COMPLETED,
          referenceId: landlordReferenceId,
          propertyId: context.propertyId,
          applicationId,
          metadata: {
            paymentMethod: 'wallet',
            tenantUserId: userId,
            rentAmount: context.rentAmount,
            depositAmount: context.depositAmount,
          },
        },
      });

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          rentAmountPaid: context.rentAmount,
          securityDeposit: context.depositAmount,
        },
      });
    });

    if (alreadySettled) {
      return { alreadyPaid: true, context, paymentMethod: 'wallet' as const };
    }

    try {
      const { notifyMoveInPaymentReceived } = await import('./leasingNotification.service');
      const amountLabel = `${context.currency} ${Number(context.totalAmount).toLocaleString()}`;
      const property = context.propertyId
        ? await prismaClient.properties.findUnique({
            where: { id: context.propertyId },
            select: { name: true },
          })
        : null;
      await notifyMoveInPaymentReceived({
        landlordUserId: context.landlordUserId,
        applicantUserId: userId,
        actorUserId: userId,
        applicationId,
        amountLabel,
        propertyName: property?.name,
      });
    } catch (notifyError) {
      console.error('Failed to notify on move-in payment:', notifyError);
    }

    return { paid: true, context, paymentMethod: 'wallet' as const };
  }
}

export default new MoveInPaymentService();
