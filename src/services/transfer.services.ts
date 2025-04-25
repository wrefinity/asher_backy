import { TransactionReference, TransactionStatus, TransactionType } from "@prisma/client";
import { prismaClient } from "..";
import { Prisma } from "@prisma/client";
import walletService from "./wallet.service";
import { randomBytes } from 'crypto';
import transactionServices from "./transaction.services";

class TransferService {
    transferFunds = async (senderId: string, data: any, currency: string) => {
        const senderWallet = await walletService.getOrCreateWallet(senderId, currency);
        const recieiverWallet = await walletService.getOrCreateWallet(data.recieiverId, currency);

        // check that the receiver and the sender wallet has same currency type
        if (senderWallet.currency != recieiverWallet.currency)
            throw new Error("Both the sender and the receiver wallet must have same currency type")
        // ensure that the sender wallet has sufficient fund
        await walletService.ensureSufficientBalance(senderWallet.id, senderWallet.userId, data.amount);

        return await prismaClient.$transaction(async (prisma) => {
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
            const transactionRecord = await prisma.transaction.create({
                data: {
                    userId: senderId,
                    amount: data.amount,
                    description: data.description || `Transferred ${data.amount} to ${recieiverWallet.userId}`,
                    type: TransactionType.DEBIT,
                    reference: data.reference || TransactionReference.MAKE_PAYMENT,
                    status: TransactionStatus.COMPLETED,
                    walletId: senderWallet.id,
                    referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`
                } as Prisma.TransactionUncheckedCreateInput,
            })
            return transactionRecord;
        })
    }

    getTransactionsByUserId = async (userId: string) =>{
        return prismaClient.transaction.findMany({
            where: { userId },
            include: {
                wallet: true
            }
        })
    }

    payBill = async (data: any, tenantId: string, currency: string) => {
        //get tenant information
        const tenant = await prismaClient.tenants.findUnique({
            where: { id: tenantId },
            include: {
                landlord: {
                    select: { userId: true }
                },
                user: {
                    include: {
                        profile: {
                            select: { fullname: true }
                        }
                    }
                }
            }
        })
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const tenantWallet = await walletService.getOrCreateWallet(tenant.userId, currency);
        const landlordWallet = await walletService.getOrCreateWallet(tenant.landlord.userId, currency);

        await walletService.ensureSufficientBalance(tenantWallet.id, tenantWallet.userId, data.amount);

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

            // create tenant transaction table
            const propertyTransaction = await prisma.transaction.create({
                data: {
                  userId: tenant.userId,
                  amount: data.amount,
                  description: `${data.billType} payment transaction`,
                  type: 'DEBIT',
                  reference: data.billType,
                  status: 'COMPLETED',
                  walletId: tenantWallet.id,
                  referenceId: `REF-${Date.now()}-${randomBytes(4).toString('hex')}`,
                  propertyId: tenant.propertyId,
                } as Prisma.TransactionUncheckedCreateInput,
              });
              

            //create landlord transaction
            await transactionServices.createCounterpartyTransaction({
                userId: tenant.landlord.userId,
                amount: data.amount,
                description: `${data.billType} payment received from ${tenant.user?.profile?.fullname}`,
                reference: data.billType,
                walletId: landlordWallet.id,
                propertyId: data?.propertyId,
                billId: data?.billId,
            });

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

    async makeAdsPayments(amount: any, userId: string, currency: string) {
        const user = await prismaClient.users.findUnique({
            where: { id: userId },
        })
        if (!user) {
            throw new Error('Tenant not found');
        }

        //get tenant wallet

        const userWallet = await walletService.getOrCreateWallet(user.id, currency);
        await walletService.ensureSufficientBalance(userWallet.id, userWallet.userId, amount);

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
                reference: TransactionReference.MAKE_PAYMENT,
                type: TransactionType.DEBIT,
                status: TransactionStatus.COMPLETED,
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