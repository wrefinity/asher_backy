import axios from "axios";
import { Request, Response } from 'express'
import crypto, { randomUUID } from 'crypto'
import transactionServices from "./transaction.services";
import errorService from "./error.service";
import { PaystackResponseType, WebhookEventResponse } from "../utils/types";
import { PAYSTACK_SECRET_KEY } from "../secrets"
import { Currency, PaymentGateway, TransactionReference, TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
import walletService from "./wallet.service";
import { Decimal } from "@prisma/client/runtime/library";


class PayStackService {
    // Implement methods for PayStack API integration
    private readonly payStackSecretKey: string;
    // private readonly webHookSecretKey: string;
    private readonly payStackBaseUrl: string = 'https://api.paystack.co';

    constructor() {
        const secretKey = PAYSTACK_SECRET_KEY;
        if (!secretKey) {
            throw new Error('Missing PayStack secret key');
        }
        this.payStackSecretKey = secretKey;
    }

    private getHeaders(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.payStackSecretKey}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        };
    }


    // Method to initiate a payment transaction
    async initializePayment(
        userId: string,
        amount: number,
        currency: Currency,
        email: string,
        type: TransactionReference,
        walletId?: string,
        propertyId?: string,
        extraMetadata?: Record<string, string>
    ) {
        try {

            // Generate a unique reference — combine UUID + type
            const uniqueRef = `${type}_${randomUUID()}`;
            // Prepare metadata
            const metadata = {
                userId,
                walletId: walletId || '',
                propertyId: propertyId || '',
                type,
                fundAmount: String(amount),
                fundCurrency: currency,
                ...extraMetadata,
            };
            const response = await axios.post<PaystackResponseType>(
                `${this.payStackBaseUrl}/transaction/initialize`,
                {
                    amount: amount * 100,
                    email,
                    currency: currency || Currency.NGN,
                    metadata,
                    reference: uniqueRef,
                    ...(extraMetadata?.callbackUrl
                        ? { callback_url: extraMetadata.callbackUrl }
                        : {}),
                },
                { headers: this.getHeaders() });


            const { reference, authorization_url } = response.data.data;
            // create payment basse on orderId or walletId

            return {
                authorizationUrl: authorization_url,
                reference,
            };

        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Error initializing payment: ${error}`);
            }
            throw error;
        }
    }

    async handleWebhook(req: Request, res: Response) {
        const signature = req.headers['x-paystack-signature'];
        if (typeof signature !== 'string') {
            return res.status(400).json({ message: 'Invalid Signature header' });
        }

        const rawBody = Buffer.isBuffer(req.body)
            ? req.body.toString('utf8')
            : JSON.stringify(req.body);
        const computedSignature = crypto.createHmac('sha512', this.payStackSecretKey).update(rawBody).digest('hex');

        console.log("Received Signature:", signature);
        console.log("Computed Signature:", computedSignature);

        if (signature !== computedSignature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const event: WebhookEventResponse = JSON.parse(rawBody);
        console.log("Logging Paystack webhook event", event);

        try {
            switch (event.event) {
                case 'charge.success':
                    await this.handleSuccessfulPayment(event.data);
                    break;
                case 'charge.failed':
                    await transactionServices.handleFailedPayment(event.data);
                    break;
                default:
                    // Handle other events as needed
                    break;
            }
            return res.status(200).json({ message: 'Webhook processed successfully' });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }



    async handleSuccessfulPayment(data: any) {
        const transactions = await prismaClient.transaction.findUnique({
            where: { referenceId: data.reference }
        });

        if (transactions?.status === TransactionStatus.COMPLETED) {
            return transactions;
        }

        const metadata = data.metadata || {};
        const userId = metadata.userId || transactions?.userId;
        const walletId = metadata.walletId || transactions?.walletId;
        const actualAmount = data.amount / 100;
        const currency = (data.currency || metadata.fundCurrency || 'NGN').toUpperCase();
        const purpose = metadata.type || transactions?.reference;

        if (purpose === TransactionReference.FUND_WALLET || transactions?.reference === TransactionReference.FUND_WALLET) {
            if (!userId || !walletId) {
                console.error(`Cannot complete Paystack wallet funding — missing metadata for ${data.reference}`);
                return;
            }
            return transactionServices.completeWalletFunding({
                userId,
                walletId,
                amount: actualAmount,
                currency,
                referenceId: data.reference,
                paymentGateway: PaymentGateway.PAYSTACK,
                description: `Wallet funding of ${actualAmount} ${currency} via PAYSTACK`,
                metadata: data,
            });
        }

        if (
            purpose === TransactionReference.APPLICATION_FEE ||
            transactions?.reference === TransactionReference.APPLICATION_FEE
        ) {
            const applicationFeeService = (await import('./applicationFee.service')).default;
            return applicationFeeService.settleApplicationFeePayment({
                tenantReferenceId: metadata.tenantReferenceId,
                landlordReferenceId: metadata.landlordReferenceId,
                providerReference: data.reference,
                amount: actualAmount,
                currency,
                paymentGateway: PaymentGateway.PAYSTACK,
            });
        }

        if (transactions?.reference === TransactionReference.RECEIVE_PAYMENT) {
            await this.handlePayeeCreatorPayment([transactions]);
        }
    }

    async handleWalletTopUp(data: any) {
        return this.handleSuccessfulPayment(data);
    }

    async handlePayeeCreatorPayment(transactions: any[]) {
        const payeeTransaction = transactions.find(t => t.type === TransactionType.DEBIT);
        const creatorTransaction = transactions.find(t => t.type === TransactionType.CREDIT);

        if (!payeeTransaction || !creatorTransaction) {
            console.error(`Invalid transaction pair for payment`);
            return;
        }

        await prismaClient.$transaction(async (prisma) => {
            // Update payee's transaction status
            await prisma.transaction.update({
                where: { id: payeeTransaction.id },
                data: { status: TransactionStatus.COMPLETED },
            });

            // Update creator's transaction status
            await prisma.transaction.update({
                where: { id: creatorTransaction.id },
                data: { status: TransactionStatus.COMPLETED },
            });

            // Update payee's wallet (debit)
            await prisma.wallet.update({
                where: { id: payeeTransaction.walletId },
                data: { balance: { decrement: payeeTransaction.amount } },
            });

            // Update creator's wallet (credit)
            await prisma.wallet.update({
                where: { id: creatorTransaction.walletId },
                data: { balance: { increment: creatorTransaction.amount } },
            });
        });
    }

    async handleFailedPayment(reference: string) {
        const transactions = await prismaClient.transaction.findMany({
            where: { referenceId: reference }
        });

        for (const transaction of transactions) {
            await prismaClient.transaction.update({
                where: { id: transaction.id },
                data: { status: TransactionStatus.FAILED }
            });
        }
    }

    async processPaystackPayout(
        walletId: string,
        amount: number,
        bankDetails: any,
        reference: string
    ) {
        const response = await axios.post(
            `${this.payStackBaseUrl}/transfer`,
            {
                source: 'balance',
                amount: amount * 100,
                recipient: bankDetails.recipientCode,
                reference,
            },
            {
                headers: this.getHeaders()

            }
        );

        // Deduct from wallet only after successful API call
        await walletService.updateWalletBalance(walletId, new Decimal(amount), 'decrement');
        await transactionServices.updateTransactionStatus(reference, TransactionStatus.COMPLETED, {
            paystackResponse: response.data,
        });
    }

    async verifyPayment(referenceId: string) {
        // Verify payment with Paystack
        const response = await axios.get(
            `${this.payStackBaseUrl}/transaction/verify/${referenceId}`,
            { headers: this.getHeaders() }
        );

        const paystackData = response.data.data;

        if (paystackData.status !== 'success') {
            throw new Error('Payment not succeeded');
        }

        const metadata = paystackData.metadata as {
            userId?: string;
            walletId?: string;
            propertyId?: string;
            type?: string;
            fundCurrency?: string;
        };

        // Find transaction by reference
        const transaction = await prismaClient.transaction.findUnique({
            where: { referenceId },
            include: { wallet: true }
        });

        if (!transaction) {
            const settled = await this.handleSuccessfulPayment(paystackData);
            if (!settled) {
                throw new Error('Transaction not found');
            }
            return settled;
        }

        // Prevent re-processing
        if (transaction.status === TransactionStatus.COMPLETED) {
            return transaction;
        }

        const amount = paystackData.amount / 100;
        const currency = (paystackData.currency || metadata.fundCurrency || 'NGN').toUpperCase();
        const purpose = (metadata as { type?: string }).type || transaction.reference;

        if (
            purpose === TransactionReference.APPLICATION_FEE ||
            transaction.reference === TransactionReference.APPLICATION_FEE
        ) {
            const applicationFeeService = (await import('./applicationFee.service')).default;
            const txMeta = (transaction.metadata || {}) as Record<string, string>;
            return applicationFeeService.settleApplicationFeePayment({
                tenantReferenceId: txMeta.tenantReferenceId,
                landlordReferenceId: txMeta.landlordReferenceId,
                providerReference: referenceId,
                amount,
                currency,
                paymentGateway: PaymentGateway.PAYSTACK,
            });
        }

        // Update transaction and wallet in a single Prisma transaction
        return await prismaClient.$transaction(async (prisma) => {
            // Update transaction status and attach Paystack data
            const updatedTransaction = await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED,
                    metadata: { ...(transaction.metadata as object), paystackData }
                }
            });

            // Conditionally update wallet balance if walletId is present in metadata
            if (metadata.walletId) {
                await prisma.wallet.update({
                    where: { id: metadata.walletId },
                    data: {
                        balance: { increment: new Decimal(amount) }
                    }
                });
            }

            return updatedTransaction;
        });
    }

}

export default new PayStackService();