import Stripe from 'stripe';
import { Request, Response } from 'express';
import { prismaClient } from '..';
import { TransactionStatus, TransactionType } from '@prisma/client';
import walletService from './wallet.service';
import transactionServices from './transaction.services';
import { Decimal } from '@prisma/client/runtime/library';

// Types
type StripeCustomer = {
    id: string;
    email: string;
    name: string;
};

type StripePaymentIntent = {
    id: string;
    amount: number;
    currency: string;
    customer: string;
    status: Stripe.PaymentIntent.Status;
    client_secret: string;
};

type StripeSubscription = {
    id: string;
    customer: string;
    status: Stripe.Subscription.Status;
    items: {
        data: Array<{
            price: { id: string };
        }>;
    };
};

type StripeWebhookEvent = {
    id: string;
    type: string;
    data: {
        object: any;
    };
};

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing Stripe environment variables');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

class StripeService {
    async createCustomer(email: string, name: string): Promise<StripeCustomer> {
        try {
            const customer = await stripe.customers.create({ email, name });
            return {
                id: customer.id,
                email: customer.email!,
                name: customer.name!,
            };
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            throw new Error('Failed to create Stripe customer');
        }
    }

    async createPaymentIntent(userId: string, amount: number, currency: string, customerId: string, walletId?: string): Promise<StripePaymentIntent> {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                customer: customerId,
                payment_method_types: ['card'],
                metadata: {
                    userId,
                    walletId: walletId,
                },
            });
            return {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                customer: paymentIntent.customer as string,
                status: paymentIntent.status,
                client_secret: paymentIntent.client_secret!,
            };
        } catch (error) {
            console.error('Error creating Stripe payment intent:', error);
            throw new Error('Failed to create Stripe payment intent');
        }
    }

    async createSubscription(customerId: string, priceId: string): Promise<StripeSubscription> {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
            });
            return {
                id: subscription.id,
                customer: subscription.customer as string,
                status: subscription.status,
                items: subscription.items,
            };
        } catch (error) {
            console.error('Error creating Stripe subscription:', error);
            throw new Error('Failed to create Stripe subscription');
        }
    }

    async verifyPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                throw new Error('Payment not succeeded');
            }


            if (paymentIntent.status === 'succeeded') {
                this.handleSuccessfulPayment(paymentIntent as StripePaymentIntent);
            }

            return {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                customer: paymentIntent.customer as string,
                status: paymentIntent.status,
                client_secret: paymentIntent.client_secret!,
            };
        } catch (error) {
            console.error('Error verifying Stripe payment intent:', error);
            return null;
        }
    }

    async handleWebhook(req: Request, res: Response): Promise<void> {
        const sig = req.headers['stripe-signature'];

        if (typeof sig !== 'string') {
            res.status(400).send('Invalid Stripe signature');
            return;
        }

        let event: StripeWebhookEvent;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET) as StripeWebhookEvent;
        } catch (err) {
            console.error('Error verifying webhook signature:', err);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
                    break;
                case 'payment_intent.succeeded':
                    await this.handleSuccessfulPayment(event.data.object as StripePaymentIntent);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handleFailedPayment(event.data.object as StripePaymentIntent);
                    break;
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdate(event.data.object as StripeSubscription);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionCancellation(event.data.object as StripeSubscription);
                    break;
                // Handle other event types as needed
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).send('Error processing webhook');
        }
    }

    async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
        // Ensure the session is paid
        if (session.payment_status === 'paid') {
            // Extract the session ID
            const sessionId = session.id;
            // Call your existing handleLinkSuccessfulPayment method
            await this.handleLinkSuccessfulPayment(sessionId);
        } else {
            console.log(`Checkout session ${session.id} was not paid`);
        }
    }
    async handleSuccessfulPayment(paymentIntent: StripePaymentIntent) {

        const transaction = await prismaClient.transaction.findUnique({
            where: { referenceId: paymentIntent.id },
        });

        if (!transaction) {
            console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }
        if (transaction.status === 'COMPLETED') {
            return transaction; // Already processed
        }
        const amount = paymentIntent.amount / 100; // Convert to major units


        await prismaClient.$transaction(async (prisma) => {
            const updatedTransaction = await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED,
                    metadata: { ...(transaction.metadata as object), paymentIntent }
                },
            });

            await prisma.wallet.update({
                where: { id: transaction.walletId },
                data: { balance: { increment: new Decimal(amount) } },
            });
            return updatedTransaction;
        });
    }

    private async handleFailedPayment(paymentIntent: StripePaymentIntent): Promise<void> {
        const transaction = await prismaClient.transaction.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!transaction) {
            console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }

        await prismaClient.transaction.update({
            where: { id: transaction.id },
            data: {
                status: TransactionStatus.FAILED,
            },
        });
    }

    private async handleSubscriptionUpdate(subscription: StripeSubscription): Promise<void> {

        await prismaClient.subscription.upsert({
            where: { stripeSubscriptionId: subscription.id },
            update: {
                status: subscription.status,
                //TODO: verify that we don't need other fields
            },
            create: {
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                userId: await this.getUserIdFromStripeCustomerId(subscription.customer),

            },
        });
    }

    private async handleSubscriptionCancellation(subscription: StripeSubscription): Promise<void> {
        await prismaClient.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });

    }

    createOrGetStripeCustomer = async (userId: string): Promise<StripeCustomer> => {
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.stripeCustomerId) {
            // If the user already has a Stripe Customer ID, fetch and return the customer
            const stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId) as StripeCustomer;
            return {
                id: stripeCustomer.id,
                email: stripeCustomer.email!,
                name: stripeCustomer.name!,
            };
        }

        // If the user doesn't have a Stripe Customer ID, create a new customer
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.profile?.fullname || user.email,
            metadata: { userId: user.id },
        });

        // Save the Stripe Customer ID to the user record
        await prismaClient.users.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id },
        });

        return {
            id: customer.id,
            email: customer.email!,
            name: customer.name!,
        };
    }

    async handleLinkSuccessfulPayment(sessionId: string): Promise<void> {
        const payeeTransaction = await prismaClient.transaction.findFirst({
            where: {
                stripePaymentIntentId: sessionId,
                type: TransactionType.DEBIT
            },
        });

        const creatorTransaction = await prismaClient.transaction.findFirst({
            where: {
                stripePaymentIntentId: sessionId,
                type: TransactionType.CREDIT
            },
        });

        if (!payeeTransaction || !creatorTransaction) {
            console.error(`Transactions not found for PaymentIntent: ${sessionId}`);
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

    private async getUserIdFromStripeCustomerId(stripeCustomerId: string): Promise<string> {
        const user = await prismaClient.users.findFirst({
            where: { stripeCustomerId },
        });

        if (!user) {
            throw new Error(`User not found for Stripe Customer ID: ${stripeCustomerId}`);
        }

        return user.id;
    }

    async createPaymentLink(amount: number, currency: string, customerId: string, expiryDurationInMinutes: number) {
        try {
            // Create a new Checkout Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency,
                            product_data: {
                                name: 'Service Payment',
                            },
                            unit_amount: amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                customer: customerId,
                // Set the expiration time for the checkout session
                expires_at: Math.floor(Date.now() / 1000) + expiryDurationInMinutes * 60,
                success_url: 'https://yourdomain.com/success',
                cancel_url: 'https://yourdomain.com/cancel',
            });
            console.log(session);

            // Return the URL to the checkout session
            return {
                id: session.id,
                url: session.url,
            };
        } catch (error) {
            console.error('Error creating Stripe payment link:', error);
            throw new Error('Failed to create Stripe payment link');
        }
    }

    async processStripePayout(
        walletId: string,
        amount: number,
        bankDetails: any,
        reference: string
    ) {
        // First create a Stripe payout
        const payout = await stripe.payouts.create({
            amount: Math.round(amount * 100),
            currency: 'gbp',
            metadata: {
                walletId,
                reference,
            },
            destination: bankDetails.accountId, // Assuming this is a Stripe bank account ID
        });

        // Deduct from wallet only after successful payout creation
        await walletService.updateWalletBalance(walletId, new Decimal(amount), 'decrement');
        await transactionServices.updateTransactionStatus(reference, TransactionStatus.COMPLETED, {
            stripePayout: payout,
        });
    }

}

export default new StripeService();