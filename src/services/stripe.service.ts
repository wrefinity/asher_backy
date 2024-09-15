import Stripe from 'stripe';
import { Request, Response } from 'express';
import { prismaClient } from '..';
import { TransactionStatus, TransactionType } from '@prisma/client';

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
        object: StripePaymentIntent | StripeSubscription;
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

    async createPaymentIntent(amount: number, currency: string, customerId: string): Promise<StripePaymentIntent> {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                customer: customerId,
                payment_method_types: ['card'],
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

    async handleSuccessfulPayment(paymentIntent: StripePaymentIntent): Promise<void> {
        const transaction = await prismaClient.transactions.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!transaction) {
            console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }

        await prismaClient.$transaction(async (prisma) => {
            await prisma.transactions.update({
                where: { id: transaction.id },
                data: {
                    transactionStatus: TransactionStatus.COMPLETED,
                },
            });

            await prisma.wallet.update({
                where: { id: transaction.walletId },
                data: {
                    balance: {
                        increment: transaction.amount,
                    },
                },
            });
        });
    }

    private async handleFailedPayment(paymentIntent: StripePaymentIntent): Promise<void> {
        const transaction = await prismaClient.transactions.findUnique({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!transaction) {
            console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
            return;
        }

        await prismaClient.transactions.update({
            where: { id: transaction.id },
            data: {
                transactionStatus: TransactionStatus.FAILED,
            },
        });

        // TODO: Implement notification to user about failed payment
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

        // TODO: Implement any necessary cleanup or notification logic
    }

    async createOrGetStripeCustomer(userId: string): Promise<StripeCustomer> {
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

    private async getUserIdFromStripeCustomerId(stripeCustomerId: string): Promise<string> {
        const user = await prismaClient.users.findFirst({
            where: { stripeCustomerId },
        });

        if (!user) {
            throw new Error(`User not found for Stripe Customer ID: ${stripeCustomerId}`);
        }

        return user.id;
    }
}

export default new StripeService();