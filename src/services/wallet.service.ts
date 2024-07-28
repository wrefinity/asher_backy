import { TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
import paystackServices from "./paystack.services";
import transactionService from "./transaction.services";


class WalletService {

    async ensureSufficientBalance(walletId: string, amount: number) {
        const wallet = await prismaClient.wallet.findUnique({
            where: { id: walletId }
        });
        if (!wallet) {
            throw new Error(`Wallet not found.`);
        }
        if (wallet.balance.toNumber() < amount) {
            throw new Error(`Insufficient balance.`);
        }
    }

    async getOrCreateWallet(userId: string) {
        let wallet = await prismaClient.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            wallet = await prismaClient.wallet.create({
                data: {
                    userId,
                    balance: 0,
                },
            });
        }

        return wallet;
    }

    async fundWallet(userId: string, amount: number) {
        const wallet = await this.getOrCreateWallet(userId);
        const user = await prismaClient.users.findUnique({
            where: { id: userId }, 
            include: {
                profile: {
                    select: {
                        fullname: true,
                    }
                }
            }
        });
        if (!user) {
            throw new Error("User not found.")
        }

        const transactionDetails = {
            amount: amount,
            email: user.email,
        }
        console.log(transactionDetails);
        const paymentResponse = await paystackServices.initializePayment({ ...transactionDetails })

        await transactionService.createTransaction({
            userId,
            amount: amount,
            description: `Wallet funding of ${amount}`,
            transactionType: TransactionType.FUNDWALLET,
            transactionStatus: TransactionStatus.PENDING,
            walletId: wallet.id,
            referenceId: paymentResponse.data.reference,
            transactionId: paymentResponse.data.access_code
        })
        return paymentResponse.data.authorization_url;
    }


}

export default new WalletService();