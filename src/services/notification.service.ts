import { prismaClient } from '..';
import { UpdateNotificationPreferencesInput } from '../validations/interfaces/profile.interface';
import {NotificationCategory, NotificationChannel, Prisma} from "@prisma/client"
import { 
    shouldSendNotification, 
    mapNotificationTypeToCategory,
    getEnabledChannels 
} from '../utils/notificationPreferenceChecker';

// Notification data interface (matches Prisma model)
interface NotificationData {
    sourceId?: string;
    destId: string;
    title: string;
    message: string;
    category?: NotificationCategory;
}

class NotificationService {
    /**
     * Create a notification after checking user preferences
     * @param data - Notification data
     * @param category - Optional category override (if not provided, will be inferred from type)
     * @returns Created notification or null if user has disabled this notification type
     */
    public async createNotification(
        data: NotificationData, 
        category?: NotificationCategory
    ) {
        // Determine category from notification type if not provided
        const notificationCategory = category || 
            mapNotificationTypeToCategory(data.title || data.message || '') || 
            'COMMUNICATION'; // Default category

        // Check if user should receive this notification
        const shouldSend = await shouldSendNotification(
            data.destId,
            notificationCategory as NotificationCategory,
            data.title || '',
            'IN_APP' // Check IN_APP channel for database notifications
        );

        if (!shouldSend) {
            console.log(`Notification blocked by user preferences: ${data.destId}, category: ${notificationCategory}`);
            return null; // Don't create notification if user has disabled it
        }

        // Create and save notification using Prisma (PostgreSQL)
        try {
            const notification = await prismaClient.notification.create({
                data: {
                    sourceId: data.sourceId || null,
                    destId: data.destId,
                    title: data.title,
                    message: data.message,
                    category: notificationCategory,
                    isRead: false,
                },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    },
                    dest: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
            return notification;
        } catch (error) {
            console.error('Error saving notification to database:', error);
            return null; // Return null on error instead of throwing
        }
    }

    public async getAllNotifications(destId: string) {
        try {
            return await prismaClient.notification.findMany({
                where: { destId },
                orderBy: { createdAt: 'desc' },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    public async getNotificationById(id: string) {
        try {
            return await prismaClient.notification.findUnique({
                where: { id },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    },
                    dest: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching notification:', error);
            return null;
        }
    }

    public async updateNotification(id: string, data: Partial<NotificationData>) {
        try {
            return await prismaClient.notification.update({
                where: { id },
                data: {
                    ...(data.title && { title: data.title }),
                    ...(data.message && { message: data.message }),
                    ...(data.category && { category: data.category }),
                },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating notification:', error);
            return null;
        }
    }

    public async deleteNotification(id: string) {
        try {
            return await prismaClient.notification.delete({
                where: { id }
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            return null;
        }
    }

    public async getUnreadNotifications(userId: string) {
        try {
            return await prismaClient.notification.findMany({
                where: { 
                    destId: userId, 
                    isRead: false 
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching unread notifications:', error);
            return [];
        }
    }

    public async markAsRead(id: string) {
        try {
            return await prismaClient.notification.update({
                where: { id },
                data: { isRead: true },
                include: {
                    source: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return null;
        }
    }

    public async markAllAsRead(userId: string) {
        try {
            const result = await prismaClient.notification.updateMany({
                where: { 
                    destId: userId, 
                    isRead: false 
                },
                data: { isRead: true }
            });
            return { acknowledged: true, modifiedCount: result.count };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { acknowledged: false, modifiedCount: 0 };
        }
    }

    public async clearAllNotifications(userId: string) {
        try {
            const result = await prismaClient.notification.deleteMany({
                where: { destId: userId }
            });
            return { acknowledged: true, deletedCount: result.count };
        } catch (error) {
            console.error('Error clearing notifications:', error);
            return { acknowledged: false, deletedCount: 0 };
        }
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
