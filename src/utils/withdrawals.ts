import { STRIPE_SECRET_KEY } from "../secrets";
import Stripe from 'stripe';

// Initialize Stripe client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    typescript: true,
});

export const stripeWithdrawals = async (
    amount: number, 
    currency: string, 
    destination: string
): Promise<void> => {
    try {
        // Retrieve balance to ensure funds are available
        const balance = await stripe.balance.retrieve();
        
        if (!balance?.available || balance.available.length === 0 || balance.available[0].amount < amount) {
            throw new Error("Insufficient funds for the transaction.");
        }

        // Create the payout
        const payout = await stripe.payouts.create({
            amount,
            currency,
            method: 'instant',
            destination,
        });

        console.log("Payout created successfully:", payout);
    } catch (error: any) {
        console.error("Error creating payout:", error.message);
        throw new Error("Payout failed: " + error.message);
    }
};
