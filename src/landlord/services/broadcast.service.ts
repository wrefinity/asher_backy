import { BroadcastType } from "@prisma/client";
import { prismaClient } from "../..";
import emailService from "../../services/emailService";
import userServices from "../../services/user.services";

class BroadcastService {

    constructor() { }

    async getBroadcastsByLandlord(landlordId: string) {
        return await prismaClient.broadcast.findMany({
            where: { landlordId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBroadcastById(id: string, landlordId: string) {
        return await prismaClient.broadcast.findUnique({
            where: { id, landlordId },
        });
    }

    async getBroadcastByCategory(category: string, landlordId: string) {
        return await prismaClient.broadcast.findMany({
            where: { category, landlordId },
        });
    }

    async sendBroadcast(broadcastData, landlordId: string) {
        const { type, category, subject, recipients, message } = broadcastData;
        const broadcast = await prismaClient.broadcast.create({
            data: {
              landlordId,
              type,
              category,
              subject,
              message,
              recipients,
            },
          });
        try {
            if (type === BroadcastType.EMAIL) {
                const batchSize = 100; // Number of emails to send in a batch
                for (let i = 0; i < recipients.length; i += batchSize) {
                    const batch = recipients.slice(i, i + batchSize);
                    await this.sendBatchEmails(batch, subject, message, broadcastData.senderEmail);
                }
            } else if (type === BroadcastType.CHAT) {
                // Handle chat messaging
            }

            return { message: 'Broadcast initiated successfully!', broadcastId: broadcast.id };
        } catch (error) {
            throw new Error(`Failed to send broadcast: ${error.message}`);
        }
    }

    async sendBatchEmails(batch, subject, message, senderEmail) {
        const emailPromises = batch.map(recipientId => {
            return userServices.findUserByEmail(recipientId).then(recipient => {
                if (recipient) {
                    return emailService.createEmail({
                        senderEmail,
                        recieverEmail: recipient.email,
                        subject,
                        message,
                        isDraft: false,
                        isSent: true,
                    });
                }
            });
        });

        await Promise.all(emailPromises); // Send all emails in parallel
    }
}

export default new BroadcastService();