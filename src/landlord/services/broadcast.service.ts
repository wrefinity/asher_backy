import { BroadcastType } from "@prisma/client";
import { prismaClient } from "../..";
import emailService from "../../services/emailService";
import userServices from "../../services/user.services";

class BroadcastService {

    constructor() { }

    // BROADCAST METHODS

    async createBroadcastCategory(data: {
        name: string;
        location?: string;
        propertyId?: string;
        memberIds: string[];
    }, landlordId: string) {
        return await prismaClient.broadcastCategory.create({
            data: {
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
                        user: {
                            include: {
                                tenant: true,
                                landlords: true,
                                agents: true
                            }
                        }
                    }
                },
                property: true
            }
        });
    }

    async getBroadcastCategories(landlordId: string) {
        return await prismaClient.broadcastCategory.findMany({
            where: {
                property: {
                    landlordId: landlordId
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            include: {
                                tenant: true,
                                landlords: true,
                                agents: true
                            }
                        }
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
                property: {
                    landlordId: landlordId
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            include: {
                                tenant: true,
                                landlords: true,
                                agents: true
                            }
                        }
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
                property: {
                    landlordId: landlordId
                }
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
                property: {
                    landlordId: landlordId
                }
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
                                user: true
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
    }, landlordId: string) {
        // Verify the category belongs to the landlord
        const category = await this.getBroadcastCategoryById(data.categoryId, landlordId);
        if (!category) {
            throw new Error('Category not found or access denied');
        }

        // Get all category member emails
        const categoryMemberEmails = category.members.map(member => member.user.email);
        
        // Get extra member emails if provided
        let extraMemberEmails: string[] = [];
        if (data.extraMemberIds && data.extraMemberIds.length > 0) {
            const extraMembers = await prismaClient.users.findMany({
                where: {
                    id: { in: data.extraMemberIds }
                },
                select: { email: true }
            });
            extraMemberEmails = extraMembers.map(user => user.email);
        }

        // Combine all recipient emails (category members + extra members)
        const allRecipients = [...new Set([...categoryMemberEmails, ...extraMemberEmails])];

        const broadcastData: any = {
            landlordId,
            subject: data.subject,
            message: data.message,
            type: data.type,
            categoryId: data.categoryId,
            recipients: allRecipients,
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
                                user: true
                            }
                        }
                    }
                }
            }
        });

        // If not a draft and no scheduledAt, send immediately
        if (!data.isDraft && !data.scheduledAt) {
            await this.sendBroadcast(broadcast.id, landlordId);
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
    }, landlordId: string) {
        const isDraft = data.action === 'draft';
        const scheduledAt = data.action === 'schedule' ? data.scheduledAt : undefined;

        return await this.createBroadcast({
            ...data,
            isDraft,
            scheduledAt
        }, landlordId);
    }

    async sendDraftBroadcast(broadcastId: string, landlordId: string) {
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

        return await this.sendBroadcast(broadcastId, landlordId);
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
        let recipients = broadcast.recipients;
        if (data.categoryId || data.extraMemberIds) {
            const categoryId = data.categoryId || broadcast.categoryId;
            const category = await this.getBroadcastCategoryById(categoryId, landlordId);
            if (!category) {
                throw new Error('Category not found or access denied');
            }

            const categoryMemberEmails = category.members.map(member => member.user.email);
            let extraMemberEmails: string[] = [];
            
            if (data.extraMemberIds && data.extraMemberIds.length > 0) {
                const extraMembers = await prismaClient.users.findMany({
                    where: { id: { in: data.extraMemberIds } },
                    select: { email: true }
                });
                extraMemberEmails = extraMembers.map(user => user.email);
            }

            recipients = [...new Set([...categoryMemberEmails, ...extraMemberEmails])];
        }

        return await prismaClient.broadcast.update({
            where: { id: broadcastId },
            data: {
                ...data,
                recipients,
                updatedAt: new Date()
            },
            include: {
                category: {
                    include: {
                        members: {
                            include: {
                                user: true
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

    async sendScheduledBroadcast(broadcastId: string, landlordId: string) {
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

        return await this.sendBroadcast(broadcastId, landlordId);
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

    async sendBroadcast(broadcastId: string, landlordId: string) {
        const broadcast = await this.getBroadcastById(broadcastId, landlordId);
        if (!broadcast) {
            throw new Error('Broadcast not found');
        }

        try {
            if (broadcast.type === BroadcastType.EMAIL) {
                // Use the recipients already stored in the broadcast
                const allRecipients = broadcast.recipients;

                // Send emails in batches
                const batchSize = 100;
                for (let i = 0; i < allRecipients.length; i += batchSize) {
                    const batch = allRecipients.slice(i, i + batchSize);
                    await this.sendBatchEmails(batch, broadcast.subject, broadcast.message, broadcast.landlordId);
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
}

export default new BroadcastService();