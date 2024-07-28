import { TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
import walletService from "./wallet.service";
import { randomBytes } from 'crypto';

class TransferService {
    async transferFunds(senderId: string, recieiverId: string, amount: number, description: string) {
        const senderWallet = await walletService.getOrCreateWallet(senderId);
        const recieiverWallet = await walletService.getOrCreateWallet(recieiverId);

        await walletService.ensureSufficientBalance(senderWallet.id, amount);

        const transaction = await prismaClient.$transaction(async (prisma) => {
            //Deduct from sender's wallet
            await prisma.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: amount } }
            })


            //Add to reciever's wallet
            await prisma.wallet.update({
                where: { id: recieiverWallet.id },
                data: { balance: { increment: amount } }
            })

            // create transaction record
            const transactionRecord = await prisma.transactions.create({
                data: {
                    userId: senderId,
                    amount,
                    description,
                    transactionType: TransactionType.MAKEPAYMENT,
                    transactionStatus: TransactionStatus.COMPLETED,
                    walletId: senderWallet.id,
                    transactionId: `TRF-${Date.now()}`,
                    referenceId: `REF-${Date.now()}`
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
        const tenantWallet = await walletService.getOrCreateWallet(tenant.id);
        const landlordWallet = await walletService.getOrCreateWallet(tenant.landlordId);

        await walletService.ensureSufficientBalance(tenantWallet.id, data.amount);

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
                }
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
}

export default new TransferService();