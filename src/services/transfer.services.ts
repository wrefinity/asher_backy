import { TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
import walletService from "./wallet.service";
import { randomBytes } from 'crypto';
import transactionServices from "./transaction.services";

class TransferService {
    async transferFunds(senderId: string, data: any) {
        const senderWallet = await walletService.getOrCreateWallet(senderId, false);
        const recieiverWallet = await walletService.getOrCreateWallet(data.recieiverId, false);

        await walletService.ensureSufficientBalance(senderWallet.id, senderWallet.userId, data.amount, false);

        const transaction = await prismaClient.$transaction(async (prisma) => {
            //Deduct from sender's wallet
            await prisma.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: data.amount } }
            })


            //Add to reciever's wallet
            await prisma.wallet.update({
                where: { id: recieiverWallet.id },
                data: { balance: { increment: data.amount } }
            })

            // create transaction record
            const transactionRecord = await prisma.transactions.create({
                data: {
                    userId: senderId,
                    amount: data.amount,
                    description: data.description || `Transferred ${data.amount} to ${recieiverWallet.userId}`,
                    transactionType:  data.transactionType || TransactionType.MAKEPAYMENT,
                    transactionStatus: TransactionStatus.COMPLETED,
                    walletId: senderWallet.id,
                    referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`
                }

            })
            return transactionRecord;
        })

        return transaction;
    }

    async getTransactionsByUserId(userId: string) {
        return prismaClient.transactions.findMany({
            where: { userId },
            include: {
                wallet: true
            }
        })
    }

    async payBill(data: any, tenantId: string) {
        //get tenant information
        const tenant = await prismaClient.tenants.findUnique({
            where: { id: tenantId },
        })
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const tenantWallet = await walletService.getOrCreateWallet(tenant.id, false);
        const landlordWallet = await walletService.getOrCreateWallet(tenant.landlordId, true);

        await walletService.ensureSufficientBalance(tenantWallet.id, tenantWallet.userId, data.amount, false);

        const transaction = await prismaClient.$transaction(async (prisma) => {
            // Deduct from tenant's wallet
            const updatedTenantWallet = await prisma.wallet.update({
                where: { id: tenantWallet.id },
                data: { balance: { decrement: data.amount } }
            })

            // Add to landlord's wallet
            const updatedLandlordWallet = await prisma.wallet.update({
                where: { id: landlordWallet.id },
                data: { balance: { increment: data.amount } }
            })

            // create propertyTransaction table

            const propertyTransaction = await prisma.propertyTransactions.create({
                data: {
                    tenantId: tenant.id,
                    landlordId: tenant.landlordId,
                    amount: data.amount,
                    description: `${data.billType} payment transaction`,
                    type: data.billType,
                    transactionStatus: TransactionStatus.COMPLETED,
                    walletId: tenantWallet.id,
                    referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`,
                    paidDate: new Date(),
                    propertyId: tenant.propertyId,
                    appartmentId: tenant.apartmentOrFlatNumber.toString(),
                } as any
            })

            // TODO: Update the model for auto payment
            // If set_auto is true, update tenant's auto-payment settings
            // if (data.set_auto) {
            //     await prisma.tenants.update({
            //         where: { id: tenant.id },
            //         data: { autoPaymentEnabled: true }
            //     });
            // }

            return {
                propertyTransaction,
                tenantWallet: updatedTenantWallet,
                landlordWallet: updatedLandlordWallet,
            };
        })


        return transaction;
    }

    async makeAdsPayments(amount: any, userId: string) {
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
        })
        if (!user) {
            throw new Error('Tenant not found');
        }

        //get tenant wallet
        const userWallet = await walletService.getOrCreateWallet(user.id, false);
        await walletService.ensureSufficientBalance(userWallet.id, userWallet.userId, amount, false);

        const transaction = await prismaClient.$transaction(async (prisma) => {
            // Deduct from tenant's wallet
            const updatedUserWallet = await prisma.wallet.update({
                where: { id: userWallet.id },
                data: { balance: { decrement: amount } }
            })

            // Add to payee's wallet -> for ads asher support
            // const updatedWallet = await prisma.wallet.update({
            //     where: { id: payee.id },
            //     data: { balance: { increment: data.amount } }
            // })

            // create transaction record
            const transactionRecord = await transactionServices.createTransaction({
                userId: user.id,
                amount: amount,
                description: 'Making payment for Ads',
                transactionType: TransactionType.MAKEPAYMENT,
                transactionStatus: TransactionStatus.COMPLETED,
                walletId: userWallet.id,
                referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`

            })
            return {
                transactionRecord,
                userWallet: updatedUserWallet
            };

        })

        return transaction;
    }
}

export default new TransferService();