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
exports.stripeWithdrawals = void 0;
const secrets_1 = require("../secrets");
const stripe_1 = __importDefault(require("stripe"));
// Initialize Stripe client
const stripe = new stripe_1.default(secrets_1.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    typescript: true,
});
const stripeWithdrawals = (amount, currency, destination) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Retrieve balance to ensure funds are available
        const balance = yield stripe.balance.retrieve();
        if (!(balance === null || balance === void 0 ? void 0 : balance.available) || balance.available.length === 0 || balance.available[0].amount < amount) {
            throw new Error("Insufficient funds for the transaction.");
        }
        // Create the payout
        const payout = yield stripe.payouts.create({
            amount,
            currency,
            method: 'instant',
            destination,
        });
        console.log("Payout created successfully:", payout);
    }
    catch (error) {
        console.error("Error creating payout:", error.message);
        throw new Error("Payout failed: " + error.message);
    }
});
exports.stripeWithdrawals = stripeWithdrawals;
