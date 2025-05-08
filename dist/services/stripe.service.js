"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("stripe"));
const __1 = require("..");
const client_1 = require("@prisma/client");
// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing Stripe environment variables');
}
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});
class StripeService {
    constructor() {
        this.createOrGetStripeCustomer = (userId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield __1.prismaClient.users.findUnique({
                where: { id: userId },
                include: { profile: true },
            });
            if (!user) {
                throw new Error('User not found');
            }
            if (user.stripeCustomerId) {
                // If the user already has a Stripe Customer ID, fetch and return the customer
                const stripeCustomer = yield stripe.customers.retrieve(user.stripeCustomerId);
                return {
                    id: stripeCustomer.id,
                    email: stripeCustomer.email,
                    name: stripeCustomer.name,
                };
            }
            // If the user doesn't have a Stripe Customer ID, create a new customer
            const customer = yield stripe.customers.create({
                email: user.email,
                name: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.fullname) || user.email,
                metadata: { userId: user.id },
            });
            // Save the Stripe Customer ID to the user record
            yield __1.prismaClient.users.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id },
            });
            return {
                id: customer.id,
                email: customer.email,
                name: customer.name,
            };
        });
    }
    createCustomer(email, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const customer = yield stripe.customers.create({ email, name });
                return {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                };
            }
            catch (error) {
                console.error('Error creating Stripe customer:', error);
                throw new Error('Failed to create Stripe customer');
            }
        });
    }
    createPaymentIntent(amount, currency, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentIntent = yield stripe.paymentIntents.create({
                    amount,
                    currency,
                    customer: customerId,
                    payment_method_types: ['card'],
                });
                return {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    customer: paymentIntent.customer,
                    status: paymentIntent.status,
                    client_secret: paymentIntent.client_secret,
                };
            }
            catch (error) {
                console.error('Error creating Stripe payment intent:', error);
                throw new Error('Failed to create Stripe payment intent');
            }
        });
    }
    createSubscription(customerId, priceId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const subscription = yield stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: priceId }],
                });
                return {
                    id: subscription.id,
                    customer: subscription.customer,
                    status: subscription.status,
                    items: subscription.items,
                };
            }
            catch (error) {
                console.error('Error creating Stripe subscription:', error);
                throw new Error('Failed to create Stripe subscription');
            }
        });
    }
    verifyPaymentIntent(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
                return {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    customer: paymentIntent.customer,
                    status: paymentIntent.status,
                    client_secret: paymentIntent.client_secret,
                };
            }
            catch (error) {
                console.error('Error verifying Stripe payment intent:', error);
                return null;
            }
        });
    }
    handleWebhook(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const sig = req.headers['stripe-signature'];
            if (typeof sig !== 'string') {
                res.status(400).send('Invalid Stripe signature');
                return;
            }
            let event;
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
            }
            catch (err) {
                console.error('Error verifying webhook signature:', err);
                res.status(400).send(`Webhook Error: ${err.message}`);
                return;
            }
            try {
                switch (event.type) {
                    case 'checkout.session.completed':
                        yield this.handleCheckoutSessionCompleted(event.data.object);
                        break;
                    case 'payment_intent.succeeded':
                        yield this.handleSuccessfulPayment(event.data.object);
                        break;
                    case 'payment_intent.payment_failed':
                        yield this.handleFailedPayment(event.data.object);
                        break;
                    case 'customer.subscription.created':
                    case 'customer.subscription.updated':
                        yield this.handleSubscriptionUpdate(event.data.object);
                        break;
                    case 'customer.subscription.deleted':
                        yield this.handleSubscriptionCancellation(event.data.object);
                        break;
                    // Handle other event types as needed
                    default:
                        console.log(`Unhandled event type: ${event.type}`);
                }
                res.json({ received: true });
            }
            catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).send('Error processing webhook');
            }
        });
    }
    handleCheckoutSessionCompleted(session) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ensure the session is paid
            if (session.payment_status === 'paid') {
                // Extract the session ID
                const sessionId = session.id;
                // Call your existing handleLinkSuccessfulPayment method
                yield this.handleLinkSuccessfulPayment(sessionId);
            }
            else {
                console.log(`Checkout session ${session.id} was not paid`);
            }
        });
    }
    handleSuccessfulPayment(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield __1.prismaClient.transaction.findUnique({
                where: { stripePaymentIntentId: paymentIntent.id },
            });
            if (!transaction) {
                console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
                return;
            }
            yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                yield prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: client_1.TransactionStatus.COMPLETED,
                    },
                });
                yield prisma.wallet.update({
                    where: { id: transaction.walletId },
                    data: {
                        balance: {
                            increment: transaction.amount,
                        },
                    },
                });
            }));
        });
    }
    handleFailedPayment(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield __1.prismaClient.transaction.findUnique({
                where: { stripePaymentIntentId: paymentIntent.id },
            });
            if (!transaction) {
                console.error(`Transaction not found for PaymentIntent: ${paymentIntent.id}`);
                return;
            }
            yield __1.prismaClient.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: client_1.TransactionStatus.FAILED,
                },
            });
            // TODO: Implement notification to user about failed payment
        });
    }
    handleSubscriptionUpdate(subscription) {
        return __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.subscription.upsert({
                where: { stripeSubscriptionId: subscription.id },
                update: {
                    status: subscription.status,
                    //TODO: verify that we don't need other fields
                },
                create: {
                    stripeSubscriptionId: subscription.id,
                    status: subscription.status,
                    userId: yield this.getUserIdFromStripeCustomerId(subscription.customer),
                },
            });
        });
    }
    handleSubscriptionCancellation(subscription) {
        return __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.subscription.update({
                where: { stripeSubscriptionId: subscription.id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                },
            });
            // TODO: Implement any necessary cleanup or notification logic
        });
    }
    handleLinkSuccessfulPayment(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const payeeTransaction = yield __1.prismaClient.transaction.findFirst({
                where: {
                    stripePaymentIntentId: sessionId,
                    type: client_1.TransactionType.DEBIT
                },
            });
            const creatorTransaction = yield __1.prismaClient.transaction.findFirst({
                where: {
                    stripePaymentIntentId: sessionId,
                    type: client_1.TransactionType.CREDIT
                },
            });
            if (!payeeTransaction || !creatorTransaction) {
                console.error(`Transactions not found for PaymentIntent: ${sessionId}`);
                return;
            }
            yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Update payee's transaction status
                yield prisma.transaction.update({
                    where: { id: payeeTransaction.id },
                    data: { status: client_1.TransactionStatus.COMPLETED },
                });
                // Update creator's transaction status
                yield prisma.transaction.update({
                    where: { id: creatorTransaction.id },
                    data: { status: client_1.TransactionStatus.COMPLETED },
                });
                // Update payee's wallet (debit)
                yield prisma.wallet.update({
                    where: { id: payeeTransaction.walletId },
                    data: { balance: { decrement: payeeTransaction.amount } },
                });
                // Update creator's wallet (credit)
                yield prisma.wallet.update({
                    where: { id: creatorTransaction.walletId },
                    data: { balance: { increment: creatorTransaction.amount } },
                });
            }));
        });
    }
    getUserIdFromStripeCustomerId(stripeCustomerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findFirst({
                where: { stripeCustomerId },
            });
            if (!user) {
                throw new Error(`User not found for Stripe Customer ID: ${stripeCustomerId}`);
            }
            return user.id;
        });
    }
    createPaymentLink(amount, currency, customerId, expiryDurationInMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create a new Checkout Session
                const session = yield stripe.checkout.sessions.create({
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
            }
            catch (error) {
                console.error('Error creating Stripe payment link:', error);
                throw new Error('Failed to create Stripe payment link');
            }
        });
    }
}
exports.default = new StripeService();
