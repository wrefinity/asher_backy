import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { prismaClient } from "..";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { generateIDs } from "../utils/helpers";
import { APP_URL } from "../secrets";
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

if (!FLUTTERWAVE_SECRET_KEY) {
  throw new Error("Missing Flutterwave secret key");
}
const FLUTTERWAVE_SECRET_HASH = process.env.FLUTTERWAVE_SECRET_HASH;

if (!FLUTTERWAVE_SECRET_HASH) {
  throw new Error("Missing Flutterwave secret hash");
}

type FlutterwavePaymentResponse = {
  status: string;
  message: string;
  data: {
    link: string;
    tx_ref: string;
  };
};

class FlutterwaveService {
  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json"
    };
  }

  async initializePayment(
    amount: number,
    currency: string,
    email: string,
    tx_ref: string,
    meta_tag: string,
    description?: string,
    expiryDate?: Date,
    name?: string,
  ): Promise<FlutterwavePaymentResponse> {
    try {
      const response = await axios.post<FlutterwavePaymentResponse>(
        `${FLUTTERWAVE_BASE_URL}/payments`,
        {
          tx_ref: tx_ref,
          amount: amount,
          currency: currency,
          redirect_url: `${APP_URL}/payment/callback`,
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
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error initializing Flutterwave payment:", error);
      throw new Error("Failed to initialize Flutterwave payment");
    }
  }

  async verifyPayment(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${transactionId}`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error("Error verifying Flutterwave payment:", error);
      throw new Error("Failed to verify Flutterwave payment");
    }
  }

  async handleWebhook(req: Request, res: Response) {
    const signature = req.headers["verif-hash"];
    if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
      return res.status(401).send("Invalid signature");
    }

    const { event, data } = req.body;

    switch (event.type) {
      case "CARD_TRANSACTION":
        if (data.status === "successful") {
          const resp = await this.verifyPayment(data.txRef);
          if (resp.data.status === 'successful') {
            await this.handleSuccessfulPayment(data.txRef);
            return res.json({ received: true });
          } else {
            await this.handleFailedPayment(data.txRef);
            return res.json({ received: true });
          }
        } else {
          await this.handleFailedPayment(data.txRef);
          return res.json({ received: true });
        }
      // Handle other event types as needed
      default:
        console.log(`Unhandled event type: ${event}`);
        return res.status(400).send("Unhandled event type");
    }
  }

  async handleSuccessfulPayment(txRef: any) {
    const transactions = await prismaClient.transaction.findMany({
      where: { referenceId: txRef }
    });

    if (transactions.length === 0) {
      console.error(`Transaction not found for reference: ${txRef}`);
      return;
    }

    if (transactions.length === 1) {
      await this.handleWalletTopUp(transactions[0]);
    } else if (transactions.length === 2) {
      // This is a payment scenario with payee and creator
      await this.handlePayeeCreatorPayment(transactions);
    } else {
      console.error(`Unexpected number of transactions for reference: ${txRef}`);
    }
  }

  async handleWalletTopUp(transaction: any) {
    await prismaClient.$transaction(async (prisma) => {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.COMPLETED }
      });

      await prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: transaction.amount } }
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

  async handleFailedPayment(txRef: string) {
    const transactions = await prismaClient.transaction.findMany({
      where: { referenceId: txRef }
    });

    for (const transaction of transactions) {
      await prismaClient.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED }
      });
    }
  }
}

export default new FlutterwaveService();
