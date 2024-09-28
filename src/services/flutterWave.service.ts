import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { prismaClient } from "..";
import { TransactionStatus } from "@prisma/client";
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
            return
          } else {
            await this.handleFailedPayment(data.txRef);
            return
          }
        } else {
          await this.handleFailedPayment(data.txRef);
        }
        break;
      // Handle other event types as needed
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    res.json({ received: true });
  }

  async handleSuccessfulPayment(txRef: any) {
    const transaction = await prismaClient.transactions.findUnique({
      where: { referenceId: txRef }
    });

    if (!transaction) {
      console.error(`Transaction not found for reference: ${txRef}`);
      return;
    }

    await prismaClient.$transaction(async (prisma) => {
      await prisma.transactions.update({
        where: { id: transaction.id },
        data: { transactionStatus: TransactionStatus.COMPLETED }
      });

      await prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: transaction.amount } }
      });
    });
  }

  async handleFailedPayment(txRef: any) {
    await prismaClient.transactions.update({
      where: { referenceId: txRef },
      data: { transactionStatus: TransactionStatus.FAILED }
    });
  }
}

export default new FlutterwaveService();
