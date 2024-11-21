// import axios from "axios";
// import { Request, Response } from 'express'
// import crypto from 'crypto'
// import transactionServices from "./transaction.services";
// import errorService from "./error.service";
// import { PaystackResponseType, WebhookEventResponse } from "../utils/types";
// import {PAYSTACK_SECRET_KEY} from "../secrets"
// import { TransactionStatus, TransactionType } from "@prisma/client";
// import { prismaClient } from "..";


// class PayStackService {
//     // Implement methods for PayStack API integration
//     private readonly payStackSecretKey: string;
//     // private readonly webHookSecretKey: string;
//     private readonly payStackBaseUrl: string = 'https://api.paystack.co';

//     constructor() {
//         const secretKey = PAYSTACK_SECRET_KEY;
//         if (!secretKey) {
//             throw new Error('Missing PayStack secret key');
//         }
//         this.payStackSecretKey = secretKey;
//     }

//     private getHeaders(): Record<string, string> {
//         return {
//             Authorization: `Bearer ${this.payStackSecretKey}`,
//             'Content-Type': 'application/json',
//             'Cache-Control': 'no-cache',
//         };
//     }

//     // Method to initiate a payment transaction
//     async initializePayment(transactionDetails: any) {
//         try {
//             console.log(transactionDetails);
//             const response = await axios.post<PaystackResponseType>(
//                 `${this.payStackBaseUrl}/transaction/initialize`,
//                 transactionDetails,
//                 { headers: this.getHeaders() });
//             return response.data;

//         } catch (error) {
//             if (axios.isAxiosError(error)) {
//                 throw new Error(`Error initializing payment: ${error}`);
//             }
//             throw error;
//         }
//     }

//     async handleWebhook(req: Request, res: Response) {
//         const signature = req.headers['x-paystack-signature'];
//         if (typeof signature !== 'string') {
//             return res.status(400).json({ message: 'Invalid Signature header' });
//         }

//         const body = JSON.stringify(req.body);
//         const computedSignature = crypto.createHmac('sha512', this.payStackSecretKey).update(body).digest('hex');

//         console.log("Received Signature:", signature);
//         console.log("Computed Signature:", computedSignature);

//         if (signature !== computedSignature) {
//             return res.status(400).json({ message: 'Invalid signature' });
//         }

//         const event: WebhookEventResponse = req.body;
//         console.log("Logging Paystack webhook event", event);

//         try {
//             switch (event.event) {
//                 case 'charge.success':
//                     await this.handleSuccessfulPayment(event.data?.reference);
//                     break;
//                 case 'charge.failed':
//                     await transactionServices.handleFailedPayment(event.data);
//                     break;
//                 default:
//                     // Handle other events as needed
//                     break;
//             }
//             return res.status(200).json({ message: 'Webhook processed successfully' });
//         } catch (error) {
//             errorService.handleError(error, res);
//         }
//     }

//     async verifyPayment(referenceId: string) {
//         try {
//             const reposne = await axios.get(
//                 `${this.payStackBaseUrl}/transaction/verify/${referenceId}`,
//                 { headers: this.getHeaders() }
//             )
//             return reposne.data;
//         } catch (error) {
//             if (axios.isAxiosError(error)) {
//                 throw new Error(`Error verifying payment: ${error}`);
//             }
//             throw error;
//         }
//     }

//     async handleSuccessfulPayment(reference: any) {
//         const transactions = await prismaClient.transaction.findMany({
//           where: { referenceId: reference }
//         });
    
//         if (transactions.length === 0) {
//           console.error(`Transaction not found for reference: ${reference}`);
//           return;
//         }
    
//         if (transactions.length === 1) {
//           await this.handleWalletTopUp(transactions[0]);
//         } else if (transactions.length === 2) {
//           // This is a payment scenario with payee and creator
//           await this.handlePayeeCreatorPayment(transactions);
//         } else {
//           console.error(`Unexpected number of transactions for reference: ${reference}`);
//         }
//       }
    
//       async handleWalletTopUp(transaction: any) {
//         await prismaClient.$transaction(async (prisma) => {
//           await prisma.transaction.update({
//             where: { id: transaction.id, type:TransactionType.CREDIT },
//             data: { status: TransactionStatus.COMPLETED }
//           });
    
//           await prisma.wallet.update({
//             where: { id: transaction.walletId },
//             data: { balance: { increment: transaction.amount } }
//           });
//         });
//       }
    
//       async handlePayeeCreatorPayment(transactions: any[]) {
//         const payeeTransaction = transactions.find(t => t.type === TransactionType.DEBIT);
//         const creatorTransaction = transactions.find(t => t.type === TransactionType.CREDIT);
    
//         if (!payeeTransaction || !creatorTransaction) {
//           console.error(`Invalid transaction pair for payment`);
//           return;
//         }
    
//         await prismaClient.$transaction(async (prisma) => {
//           // Update payee's transaction status
//           await prisma.transaction.update({
//             where: { id: payeeTransaction.id },
//             data: { status: TransactionStatus.COMPLETED },
//           });
    
//           // Update creator's transaction status
//           await prisma.transaction.update({
//             where: { id: creatorTransaction.id },
//             data: { status: TransactionStatus.COMPLETED },
//           });
    
//           // Update payee's wallet (debit)
//           await prisma.wallet.update({
//             where: { id: payeeTransaction.walletId },
//             data: { balance: { decrement: payeeTransaction.amount } },
//           });
    
//           // Update creator's wallet (credit)
//           await prisma.wallet.update({
//             where: { id: creatorTransaction.walletId },
//             data: { balance: { increment: creatorTransaction.amount } },
//           });
//         });
//       }
    
//       async handleFailedPayment(reference: string) {
//         const transactions = await prismaClient.transaction.findMany({
//           where: { referenceId: reference }
//         });
    
//         for (const transaction of transactions) {
//           await prismaClient.transaction.update({
//             where: { id: transaction.id },
//             data: { status: TransactionStatus.FAILED }
//           });
//         }
//       }
// }

// export default new PayStackService();