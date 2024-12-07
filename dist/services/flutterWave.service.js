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
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
const client_1 = require("@prisma/client");
const secrets_1 = require("../secrets");
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error("Missing Flutterwave secret key");
}
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;
if (!FLUTTERWAVE_SECRET_HASH) {
    throw new Error("Missing Flutterwave secret hash");
}
class FlutterwaveService {
    constructor() {
        this.headers = {
            Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            "Content-Type": "application/json"
        };
    }
    initializePayment(amount, currency, email, tx_ref, meta_tag, description, expiryDate, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${FLUTTERWAVE_BASE_URL}/payments`, {
                    tx_ref: tx_ref,
                    amount: amount,
                    currency: currency,
                    redirect_url: `${secrets_1.APP_URL}/payment/callback`,
                    customer: {
                        email: email,
                        name: name
                    },
                    customizations: {
                        title: description || "Asher  System Funding",
                        logo: process.env.APP_LOGO_URL
                    },
                    expiry_date: expiryDate,
                    meta_tag: meta_tag
                }, { headers: this.headers });
                return response.data;
            }
            catch (error) {
                console.error("Error initializing Flutterwave payment:", error);
                throw new Error("Failed to initialize Flutterwave payment");
            }
        });
    }
    verifyPayment(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${transactionId}`, { headers: this.headers });
                return response.data;
            }
            catch (error) {
                console.error("Error verifying Flutterwave payment:", error);
                throw new Error("Failed to verify Flutterwave payment");
            }
        });
    }
    handleWebhook(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const signature = req.headers["verif-hash"];
            if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
                return res.status(401).send("Invalid signature");
            }
            const { event, data } = req.body;
            switch (event.type) {
                case "CARD_TRANSACTION":
                    if (data.status === "successful") {
                        const resp = yield this.verifyPayment(data.txRef);
                        if (resp.data.status === 'successful') {
                            yield this.handleSuccessfulPayment(data.txRef);
                            return res.json({ received: true });
                        }
                        else {
                            yield this.handleFailedPayment(data.txRef);
                            return res.json({ received: true });
                        }
                    }
                    else {
                        yield this.handleFailedPayment(data.txRef);
                        return res.json({ received: true });
                    }
                // Handle other event types as needed
                default:
                    console.log(`Unhandled event type: ${event}`);
                    return res.status(400).send("Unhandled event type");
            }
        });
    }
    handleSuccessfulPayment(txRef) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactions = yield __1.prismaClient.transaction.findMany({
                where: { referenceId: txRef }
            });
            if (transactions.length === 0) {
                console.error(`Transaction not found for reference: ${txRef}`);
                return;
            }
            if (transactions.length === 1) {
                yield this.handleWalletTopUp(transactions[0]);
            }
            else if (transactions.length === 2) {
                // This is a payment scenario with payee and creator
                yield this.handlePayeeCreatorPayment(transactions);
            }
            else {
                console.error(`Unexpected number of transactions for reference: ${txRef}`);
            }
        });
    }
    handleWalletTopUp(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                yield prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: client_1.TransactionStatus.COMPLETED }
                });
                yield prisma.wallet.update({
                    where: { id: transaction.walletId },
                    data: { balance: { increment: transaction.amount } }
                });
            }));
        });
    }
    handlePayeeCreatorPayment(transactions) {
        return __awaiter(this, void 0, void 0, function* () {
            const payeeTransaction = transactions.find(t => t.type === client_1.TransactionType.DEBIT);
            const creatorTransaction = transactions.find(t => t.type === client_1.TransactionType.CREDIT);
            if (!payeeTransaction || !creatorTransaction) {
                console.error(`Invalid transaction pair for payment`);
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
    handleFailedPayment(txRef) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactions = yield __1.prismaClient.transaction.findMany({
                where: { referenceId: txRef }
            });
            for (const transaction of transactions) {
                yield __1.prismaClient.transaction.update({
                    where: { id: transaction.id },
                    data: { status: client_1.TransactionStatus.FAILED }
                });
            }
        });
    }
}
exports.default = new FlutterwaveService();
