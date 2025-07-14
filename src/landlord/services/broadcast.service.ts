import { BroadcastType } from "@prisma/client";
import { prismaClient } from "../..";
import emailService from "../../services/emailService";
import userServices from "../../services/user.services";

class BroadcastService {

    constructor() { }

    private userSelect = {
        select: {
            id: true,
            role: true,
            email: true,
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    profileUrl: true,
                },
            },
        },
    }

    // BROADCAST METHODS

    async createBroadcastCategory(data: {
        name: string;
        location?: string;
        propertyId?: string;
        memberIds: string[];
    }, landlordId: string) {
        return await prismaClient.broadcastCategory.create({
            data: {
                landlordId: landlordId,
                name: data.name,
                location: data.location,
                propertyId: data.propertyId,
                members: {
                    create: data.memberIds.map(userId => ({
                        userId: userId
                    }))
                }
            },
            include: {
                members: {
                    include: {
                        user: this.userSelect
                    }
                },
                property: true
            }
        });
    }

    async getBroadcastCategories(landlordId: string) {
        return await prismaClient.broadcastCategory.findMany({
            where: {
                landlordId: landlordId
            },
            include: {
                members: {
                    include: {
                        user: this.userSelect
                    }
                },
                property: true,
                _count: {
                    select: {
                        members: true
                    }
                }
            }
        });
    }

    async getBroadcastCategoryById(categoryId: string, landlordId: string) {
        return await prismaClient.broadcastCategory.findFirst({
            where: {
                id: categoryId,
                landlordId: landlordId
            },
            include: {
                members: {
                    include: {
                        user: this.userSelect
                    }
                },
                property: true
            }
        });
    }

    async updateBroadcastCategory(categoryId: string, data: {
        name?: string;
        location?: string;
        propertyId?: string;
    }, landlordId: string) {
        return await prismaClient.broadcastCategory.updateMany({
            where: {
                id: categoryId,
                landlordId: landlordId
            },
            data: {
                name: data.name,
                location: data.location,
                propertyId: data.propertyId
            }
        });
    }

    async deleteBroadcastCategory(categoryId: string, landlordId: string) {
        return await prismaClient.broadcastCategory.deleteMany({
            where: {
                id: categoryId,
                landlordId: landlordId
            }
        });
    }

    // CATEGORY MEMBERS

    async addMembersToCategory(categoryId: string, memberIds: string[], landlordId: string) {
        // Verify the category belongs to the landlord
        const category = await this.getBroadcastCategoryById(categoryId, landlordId);
        if (!category) {
            throw new Error('Category not found or access denied');
        }

        // Add members (Prisma will handle duplicates due to unique constraint)
        const members = await prismaClient.broadcastCategoryMembers.createMany({
            data: memberIds.map(userId => ({
                userId: userId,
                broadcastCategoryId: categoryId
            })),
            skipDuplicates: true
        });

        return members;
    }

    async removeMembersFromCategory(categoryId: string, memberIds: string[], landlordId: string) {
        // Verify the category belongs to the landlord
        const category = await this.getBroadcastCategoryById(categoryId, landlordId);
        if (!category) {
            throw new Error('Category not found or access denied');
        }

        return await prismaClient.broadcastCategoryMembers.deleteMany({
            where: {
                broadcastCategoryId: categoryId,
                userId: {
                    in: memberIds
                }
            }
        });
    }

    async getCategoryMembers(categoryId: string, landlordId: string) {
        const category = await this.getBroadcastCategoryById(categoryId, landlordId);
        if (!category) {
            throw new Error('Category not found or access denied');
        }

        return category.members;
    }

    // BROADCAST METHODS

    async getBroadcastsByLandlord(landlordId: string) {
        console.log('getBroadcastsByLandlord');
        console.log(landlordId);
        return await prismaClient.broadcast.findMany({
            where: { landlordId },
            include: {
                category: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBroadcastById(id: string, landlordId: string) {
        return await prismaClient.broadcast.findUnique({
            where: { id, landlordId },
            include: {
                category: {
                    include: {
                        members: {
                            include: {
                                user: this.userSelect
                            }
                        },
                        property: true
                    }
                }
            }
        });
    }

    async getBroadcastsByCategory(categoryId: string, landlordId: string) {
        return await prismaClient.broadcast.findMany({
            where: {
                categoryId,
                landlordId
            },
            include: {
                category: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createBroadcast(data: {
        subject: string;
        message: string;
        type: BroadcastType;
        categoryId: string;
        extraMemberIds?: string[];
        scheduledAt?: Date;
        isDraft?: boolean;
    }, landlordId: string, userId: string) {
        // Verify the category belongs to the landlord
        const category = await this.getBroadcastCategoryById(data.categoryId, landlordId);
        if (!category) {
            throw new Error('Category not found or access denied');
        }

        // Get all category member emails
        const categoryMembers = category.members.map(member => member.userId);

        // Get extra member emails if provided
        let extraMembersIds: string[] = [];
        if (data.extraMemberIds && data.extraMemberIds.length > 0) {
            const extraMembers = await prismaClient.users.findMany({
                where: {
                    id: { in: data.extraMemberIds }
                },
                select: { id: true }
            });
            extraMembersIds = extraMembers.map(user => user.id);
        }

        // Combine all recipient ids (category members + extra members)
        const allRecipients = [...new Set([...categoryMembers, ...extraMembersIds])];

        await this.addMembersToCategory(data.categoryId, allRecipients, landlordId);

        const broadcastData: any = {
            landlordId,
            subject: data.subject,
            message: data.message,
            type: data.type,
            categoryId: data.categoryId,
            isDraft: data.isDraft || false
        };

        // Add scheduledAt if provided
        if (data.scheduledAt) {
            broadcastData.scheduledAt = data.scheduledAt;
        }

        const broadcast = await prismaClient.broadcast.create({
            data: broadcastData,
            include: {
                category: {
                    include: {
                        members: {
                            include: {
                                user: this.userSelect
                            }
                        }
                    }
                }
            }
        });

        // If not a draft and no scheduledAt, send immediately
        if (!data.isDraft && !data.scheduledAt) {
            await this.sendBroadcast(broadcast.id, landlordId, userId);
        }

        return broadcast;
    }

    async createAndSendBroadcast(data: {
        subject: string;
        message: string;
        type: BroadcastType;
        categoryId: string;
        extraMemberIds?: string[];
        scheduledAt?: Date;
        action: 'send' | 'schedule' | 'draft';
    }, landlordId: string, userId: string) {
        const isDraft = data.action === 'draft';
        const scheduledAt = data.action === 'schedule' ? data.scheduledAt : undefined;

        return await this.createBroadcast({
            ...data,
            isDraft,
            scheduledAt
        }, landlordId, userId);
    }

    async sendDraftBroadcast(broadcastId: string, landlordId: string, userId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        if (!broadcast.isDraft) {
            throw new Error('This broadcast is not a draft');
        }

        await prismaClient.broadcast.update({
            where: { id: broadcastId },
            data: { isDraft: false }
        });

        return await this.sendBroadcast(broadcastId, landlordId, userId);
    }

    async getDraftBroadcasts(landlordId: string) {
        return await prismaClient.broadcast.findMany({
            where: {
                landlordId,
                isDraft: true
            },
            include: {
                category: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateDraftBroadcast(broadcastId: string, data: {
        subject?: string;
        message?: string;
        type?: BroadcastType;
        categoryId?: string;
        extraMemberIds?: string[];
    }, landlordId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        if (!broadcast.isDraft) {
            throw new Error('This broadcast is not a draft');
        }

        // If category is being updated, recalculate recipients
        let recipients = broadcast.category.members.map(member => member.userId);
        if (data.categoryId || data.extraMemberIds) {
            const categoryId = data.categoryId || broadcast.categoryId;
            const category = await this.getBroadcastCategoryById(categoryId, landlordId);
            if (!category) {
                throw new Error('Category not found or access denied');
            }

            const categoryMembers = category.members.map(member => member.userId);
            let extraMembersIds: string[] = [];

            if (data.extraMemberIds && data.extraMemberIds.length > 0) {
                const extraMembers = await prismaClient.users.findMany({
                    where: { id: { in: data.extraMemberIds } },
                    select: { id: true }
                });
                extraMembersIds = extraMembers.map(user => user.id);
            }

            recipients = [...new Set([...categoryMembers, ...extraMembersIds])];

        }

        await this.addMembersToCategory(broadcast.categoryId, recipients, landlordId);

        return await prismaClient.broadcast.update({
            where: { id: broadcastId },
            data: {
                ...data,
                updatedAt: new Date()
            },
            include: {
                category: {
                    include: {
                        members: {
                            include: {
                                user: this.userSelect
                            }
                        }
                    }
                }
            }
        });
    }

    async getScheduledBroadcasts(landlordId: string) {
        return await prismaClient.broadcast.findMany({
            where: {
                landlordId,
                scheduledAt: {
                    not: null
                }
            },
            include: {
                category: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
    }

    async sendScheduledBroadcast(broadcastId: string, landlordId: string, userId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        if (!broadcast.scheduledAt) {
            throw new Error('This broadcast is not scheduled');
        }

        if (broadcast.scheduledAt > new Date()) {
            throw new Error('Broadcast is scheduled for a future time');
        }

        return await this.sendBroadcast(broadcastId, landlordId, userId);
    }

    async cancelScheduledBroadcast(broadcastId: string, landlordId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        if (!broadcast.scheduledAt) {
            throw new Error('This broadcast is not scheduled');
        }

        return await prismaClient.broadcast.delete({
            where: { id: broadcastId }
        });
    }

    async sendBroadcast(broadcastId: string, landlordId: string, userId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        try {
            if (broadcast.type === BroadcastType.EMAIL) {
                // Get all recipients from the category
                const allRecipients = broadcast.category.members.map(member => member.user.email);

                // Send emails in batches
                const batchSize = 100;
                for (let i = 0; i < allRecipients.length; i += batchSize) {
                    const batch = allRecipients.slice(i, i + batchSize);
                    await this.sendBatchEmails(batch, broadcast.subject, broadcast.message, userId);
                }
            } else if (broadcast.type === BroadcastType.CHAT) {
                // TODO: Implement chat broadcast functionality
                console.log('Chat broadcast functionality to be implemented');
            }

            return { message: 'Broadcast sent successfully!', broadcastId: broadcast.id };
        } catch (error) {
            throw new Error(`Failed to send broadcast: ${error.message}`);
        }
    }

    async sendBatchEmails(recipientEmails: string[], subject: string, message: string, userId: string) {
        // Get the landlord user ID (you might want to store this in config)
        console.log('recipientEmails', recipientEmails);
        console.log('subject', subject);
        console.log('message', message);
        console.log('userId', userId);
        const systemUser = await prismaClient.users.findFirst({
            where: { id: userId }
        });

        if (!systemUser) {
            throw new Error('System user not found for sending broadcasts');
        }

        const emailPromises = recipientEmails.map(async (recipientEmail) => {
            // Get the recipient user ID
            const recipientUser = await prismaClient.users.findUnique({
                where: { email: recipientEmail }
            });

            if (!recipientUser) {
                console.log(`Recipient user not found for email: ${recipientEmail}`);
                return null;
            }

            return emailService.createEmail({
                senderId: systemUser.id,
                receiverId: recipientUser.id,
                senderEmail: systemUser.email,
                receiverEmail: recipientEmail,
                subject,
                body: message,
                attachment: [],
                isDraft: false,
                isSent: true,
            });
        });

        const results = await Promise.all(emailPromises);
        return results.filter(result => result !== null);
    }

    async stats(landlordId: string) {
        // Get all broadcasts for the landlord
        const broadcasts = await this.getBroadcastsByLandlord(landlordId);

        // Get all categories for the landlord
        const categories = await this.getBroadcastCategories(landlordId);

        // Get all unique recipients across all categories
        const allRecipients = await prismaClient.broadcastCategoryMembers.findMany({
            where: {
                broadcastCategory: {
                    landlordId: landlordId
                }
            },
            include: {
                user: this.userSelect,
                broadcastCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Calculate stats
        const totalBroadcasts = broadcasts.length || 0;
        const totalEmails = broadcasts.filter(broadcast => broadcast.type === BroadcastType.EMAIL).length || 0;
        const totalChats = broadcasts.filter(broadcast => broadcast.type === BroadcastType.CHAT).length || 0;
        const totalDrafts = broadcasts.filter(broadcast => broadcast.isDraft).length || 0;
        const totalScheduled = broadcasts.filter(broadcast => broadcast.scheduledAt && broadcast.scheduledAt > new Date()).length || 0;
        const totalCategories = categories.length || 0;
        const totalRecipients = allRecipients.length || 0;
        const uniqueRecipients = new Set(allRecipients.map(recipient => recipient.userId)).size || 0;

        // Group recipients by category
        const recipientsByCategory = categories.map(category => ({
            categoryId: category.id,
            categoryName: category.name,
            memberCount: category.members.length || 0,
            members: category.members.map(member => ({
                userId: member.user.id,
                email: member.user.email,
                profile: member.user.profile
            }))
        }));

        // Get broadcast stats by type and status
        const broadcastStats = {
            total: totalBroadcasts,
            byType: {
                email: totalEmails,
                chat: totalChats
            },
            byStatus: {
                sent: totalBroadcasts - totalDrafts - totalScheduled || 0,
                drafts: totalDrafts,
                scheduled: totalScheduled
            }
        };

        // Get recent broadcasts (last 10)
        const recentBroadcasts = broadcasts
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(broadcast => ({
                id: broadcast.id,
                subject: broadcast.subject,
                type: broadcast.type,
                isDraft: broadcast.isDraft,
                scheduledAt: broadcast.scheduledAt,
                createdAt: broadcast.createdAt,
                categoryName: broadcast.category?.name || 'Unknown'
            }));

        return {
            overview: {
                totalBroadcasts,
                totalCategories,
                totalRecipients,
                uniqueRecipients
            },
            broadcastStats,
            categories: {
                total: totalCategories,
                list: categories.map(category => ({
                    id: category.id,
                    name: category.name,
                    location: category.location,
                    memberCount: category.members.length,
                    createdAt: category.createdAt
                }))
            },
            recipients: {
                total: totalRecipients,
                unique: uniqueRecipients,
                byCategory: recipientsByCategory
            },
            recentBroadcasts
        };
    }
}

export default new BroadcastService();