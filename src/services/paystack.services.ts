import axios from "axios";
import { Request, Response } from 'express'
import crypto from 'crypto'
import transactionServices from "./transaction.services";
import errorService from "./error.service";
import { PaystackResponseType, WebhookEventResponse } from "../utils/types";
import { PAYSTACK_SECRET_KEY } from "../secrets"
import { Currency, TransactionStatus, TransactionType } from "@prisma/client";
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
        walletId?: string
    ) {
        try {

            const response = await axios.post<PaystackResponseType>(
                `${this.payStackBaseUrl}/transaction/initialize`,
                {
                    amount: amount * 100, // convert to kobo
                    email,
                    currency: currency || Currency.NGN,
                    metadata: {
                        userId,
                        walletId: walletId,
                    },
                },
                { headers: this.getHeaders() });
            const { reference, authorization_url } = response.data.data;
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

        const body = JSON.stringify(req.body);
        const computedSignature = crypto.createHmac('sha512', this.payStackSecretKey).update(body).digest('hex');

        console.log("Received Signature:", signature);
        console.log("Computed Signature:", computedSignature);

        if (signature !== computedSignature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const event: WebhookEventResponse = req.body;
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

        if (!transactions) {
            console.error(`Transaction not found for reference: ${data.reference}`);
            return;
        }
        await this.handleWalletTopUp(data);

    }

    async handleWalletTopUp(data: any) {
        const { reference, amount, metadata } = data
        const amountInNaira = amount / 100;

        await prismaClient.$transaction(async (prisma) => {
            await prisma.transaction.update({
                where: { referenceId: reference },
                data: { status: TransactionStatus.COMPLETED, metadata: metadata ? { ...metadata } : undefined }
            });
            await prisma.wallet.update({
                where: { id: metadata.walletId },
                data: { balance: { increment: new Decimal(amountInNaira) } }
            });
        });
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
        )

        const paystackData = response.data.data;

        if (paystackData.status !== 'success') {
            throw new Error('Payment not succeeded');
        }

        // Find transaction by reference
        const transaction = await prismaClient.transaction.findUnique({
            where: { referenceId },
            include: { wallet: true }
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.status === TransactionStatus.COMPLETED) {
            return transaction;
        }

        const amount = paystackData.amount / 100; // Convert to major units

        return await prismaClient.$transaction(async (prisma) => {
            // Update transaction status
            const updatedTransaction = await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED,
                    metadata: { ...(transaction.metadata as object), paystackData }
                }
            });
            // Update wallet balance
            await prisma.wallet.update({
                where: { id: transaction.walletId },
                data: { balance: { increment: new Decimal(amount) } }
            });

            return updatedTransaction;
        });
    }
}

export default new PayStackService();