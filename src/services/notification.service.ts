import { prismaClient } from '..';
import Notification, { INotification } from '../model/notification';
import { UpdateNotificationPreferencesInput } from '../validations/interfaces/profile.interface';
import {NotificationCategory, NotificationChannel, Prisma} from "@prisma/client"
class NotificationService {
    public async createNotification(data: INotification) {
        const notification = new Notification(data);
        return await notification.save();
    }

    public async getAllNotifications(destId) {
        return await Notification.find({ destId });
    }

    public async getNotificationById(id: string) {
        return await Notification.findById(id);
    }

    public async updateNotification(id: string, data: any) {
        return await Notification.findByIdAndUpdate(id, data, { new: true });
    }

    public async deleteNotification(id: string) {
        return await Notification.findByIdAndDelete(id);
    }

    public async getUserNotificationPreferences(userId: string) {
        return prismaClient.notificationPreference.findMany({
            where: { userId },
            orderBy: { category: 'asc' },
        });
    }

public async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesInput
) {
    return prismaClient.$transaction(async (tx) => {
        // Delete existing preferences
        await tx.notificationPreference.deleteMany({
            where: { userId },
        });

        // Create new preferences with proper typing
        return Promise.all(
            data.preferences.map((pref) => {
                const createData: Prisma.NotificationPreferenceCreateInput = {
                    category: pref.category as NotificationCategory,
                    channels: {
                        set: pref.channels as NotificationChannel[]
                    },
                    users: { connect: { id: userId } },
                    // Category-specific fields with proper optional handling
                    ...(pref.notifyOnLoginActivity !== undefined && { 
                        notifyOnLoginActivity: pref.notifyOnLoginActivity 
                    }),
                    ...(pref.notifyOnNewMessages !== undefined && { 
                        notifyOnNewMessages: pref.notifyOnNewMessages 
                    }),
                    ...(pref.notifyPaymentInitiated !== undefined && { 
                        notifyPaymentInitiated: pref.notifyPaymentInitiated 
                    }),
                    ...(pref.notifyPaymentSuccess !== undefined && { 
                        notifyPaymentSuccess: pref.notifyPaymentSuccess 
                    }),
                    ...(pref.notifyPaymentFailed !== undefined && { 
                        notifyPaymentFailed: pref.notifyPaymentFailed 
                    }),
                    ...(pref.notifyNewMaintenanceRequest !== undefined && { 
                        notifyNewMaintenanceRequest: pref.notifyNewMaintenanceRequest 
                    }),
                    ...(pref.notifyRequestStatusChange !== undefined && { 
                        notifyRequestStatusChange: pref.notifyRequestStatusChange 
                    }),
                    ...(pref.notifyRequestMessage !== undefined && { 
                        notifyRequestMessage: pref.notifyRequestMessage 
                    }),
                    ...(pref.notifyRequestResolved !== undefined && { 
                        notifyRequestResolved: pref.notifyRequestResolved 
                    }),
                    ...(pref.notifyNewInvoice !== undefined && { 
                        notifyNewInvoice: pref.notifyNewInvoice 
                    }),
                    ...(pref.notifyTenantMoveOut !== undefined && { 
                        notifyTenantMoveOut: pref.notifyTenantMoveOut 
                    }),
                    ...(pref.notifyPropertyMatch !== undefined && { 
                        notifyPropertyMatch: pref.notifyPropertyMatch 
                    }),
                    ...(pref.notifyNewInquiry !== undefined && { 
                        notifyNewInquiry: pref.notifyNewInquiry 
                    }),
                    ...(pref.notifyNewSupportTicket !== undefined && { 
                        notifyNewSupportTicket: pref.notifyNewSupportTicket 
                    }),
                    ...(pref.receiveMarketingEmails !== undefined && { 
                        receiveMarketingEmails: pref.receiveMarketingEmails 
                    })
                };

                return tx.notificationPreference.create({
                    data: createData
                });
            })
        );
    });
}

    public async getNotificationPreferenceByCategory(userId: string, category: string) {
        return prismaClient.notificationPreference.findUnique({
            where: {
                userId_category: {
                    userId,
                    category: category as any,
                },
            },
        });
    }
}

export default new NotificationService();
