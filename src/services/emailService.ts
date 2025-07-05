import { prismaClient } from "..";
import loggers from "../utils/loggers";
import { EmailDataType } from "../utils/types";


const profileSelect = {
    select: {
        fullname: true,
        firstName: true,
        lastName: true,
        middleName: true,
        profileUrl: true,
    },
};

const userSelect = {
    select: {
        email: true,
        role: true,
        profile: profileSelect,
    },
};

export interface EmailIF {
    id?: string;
    senderEmail: string;
    receiverEmail: string;
    subject?: string;
    body: string;
    attachment: string[];
    isReadBySender?: boolean;
    isReadByReceiver?: boolean;
    isDraft?: boolean;
    isSent?: boolean;
    isReply?: boolean;
    threadId?: string;         // Root email ID for the thread
    parentEmailId?: string;    // Direct parent email ID

    // Relationships
    senderId: string;
    receiverId: string;
}

class EmailService {


    /**
     * Check if a user exists based on their email or tenantWebUserEmail
     * @param email - The email to check (can be user.email or tenant.tenantWebUserEmail)
     * @returns The user object if found, otherwise null
     */
    checkUserEmailExists = async (email: string) => {

        // Step 1: Check if the email exists in the users table
        const user = await prismaClient.users.findUnique({
            where: { email },
            include: { tenant: true }, // Include tenant details if the user is a tenant
        });

        if (user) {
            return { email: user.email, userId: user.id };
        }

        // Step 2: If not found in users table, check the tenantWebUserEmail in the tenants table
        const tenant = await prismaClient.tenants.findFirst({
            where: { tenantWebUserEmail: email },
            include: { user: true },
        });

        if (tenant) {
            return { email: tenant.tenantWebUserEmail, userId: tenant.user.id };
        }

        return null;

    }

    createEmail = async (emailData: EmailIF, isDraft: boolean = false) => {
        const { senderId, receiverId, parentEmailId, threadId, ...rest } = emailData;

        // Compute threadId if it's a reply
        let finalThreadId = threadId;
        if (parentEmailId && !threadId) {
            const parentEmail = await this.getEmailById(parentEmailId);
            finalThreadId = parentEmail?.threadId || parentEmailId;
        }

        // Build the base data
        const createData: any = {
            ...rest,
            isDraft,
            isSent: !isDraft,
            threadId: finalThreadId,
            sender: { connect: { id: senderId } },
            ...(parentEmailId && { parentEmail: { connect: { id: parentEmailId } } }),
        };

        // Only connect receiver if it's not a draft
        if (!isDraft) {
            createData.receiver = { connect: { id: receiverId } };
        }

        return await prismaClient.email.create({ data: createData });
    };


    async getEmailById(emailId: string) {
        try {
            return await prismaClient.email.findUnique({
                where: { id: emailId },
                include: {
                    sender: userSelect,
                    receiver: userSelect
                }
            })
        } catch (error) {
            loggers.error(`Error getting email: ${error}`)
            throw new Error('Failed to get email')
        }
    }
    /**
     * Get paginated user emails
     */

    async getInbox(userEmail: string, page = 1, limit = 10, search = '') {
        return prismaClient.email.findMany({
            where: {
                receiverEmail: userEmail,
                isDraft: false,
                isSpam: false,
                isArchived: false,
                isSent: true,
                OR: [
                    { subject: { contains: search, mode: 'insensitive' } },
                    { body: { contains: search, mode: 'insensitive' } },
                    { senderEmail: { contains: search, mode: 'insensitive' } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    getUserEmails = async (
        email: string,
        options: {
            sent?: boolean;
            received?: boolean;
            draft?: boolean;
            unread?: boolean;
            threads?: boolean;
        },
        pagination: {
            page: number;
            limit: number;
        } = { page: 1, limit: 10 },
        search: string = '',
    ) => {
        const where: any = { isReply: false }; // Default to not showing replies
        const skip = (pagination.page - 1) * pagination.limit;

        if (options.sent) where.senderEmail = email;
        if (options.received) where.receiverEmail = email;
        if (options.draft) where.isDraft = true;
        // For threads, only show emails that are thread starters
        if (options.threads) {
            where.OR = [
                { threadId: null }, // Original emails
                { threadId: { equals: prismaClient.email.fields.id } } // Thread starters
            ];
        }

        if (search) {
            where.OR = [
                { subject: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
                { senderEmail: { contains: search, mode: 'insensitive' } },
                { receiverEmail: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (options.unread) {
            if (options.sent) {
                where.isReadBySender = false;
            } else if (options.received) {
                where.isReadByReceiver = false;
            } else {
                where.OR = [
                    { senderEmail: email, isReadBySender: false },
                    { receiverEmail: email, isReadByReceiver: false }
                ];
            }
        }

        try {
            const [emails, total] = await Promise.all([
                prismaClient.email.findMany({
                    where,
                    skip,
                    take: pagination.limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: userSelect,
                        receiver: userSelect,
                        replies: {
                            include: {
                                sender: userSelect,
                                receiver: userSelect
                            },
                            orderBy: { createdAt: 'asc' }
                        },
                        _count: {
                            select: { replies: true }
                        }
                    }
                }),
                prismaClient.email.count({ where })
            ]);

            return {
                emails,
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(total / pagination.limit)
            };
        } catch (error) {
            loggers.error(`Error getting emails: ${error}`);
            throw new Error('Failed to get emails');
        }
    }

    /**
     * Reply to an existing email (creates a threaded reply)
     */
    async replyToEmail(
        originalEmailId: string,
        senderId: string,
        additionalMessage: string = "",
        replyAll: boolean = false
    ) {
        const originalEmail = await this.getEmailById(originalEmailId);
        if (!originalEmail) {
            throw new Error("Original email not found");
        }

        const replySubject = originalEmail.subject?.startsWith("Re:")
            ? originalEmail.subject
            : `Re: ${originalEmail.subject}`;

        const quotedBody = `
            ${additionalMessage}
            
            On ${originalEmail.createdAt.toISOString()}, ${originalEmail.senderEmail} wrote:
            ${originalEmail.body.split('\n').map(line => `> ${line}`).join('\n')}
        `;

        return this.createEmail({
            senderId,
            receiverId: originalEmail.senderId, // Reply to sender
            senderEmail: originalEmail.receiverEmail, // Current user's email
            receiverEmail: originalEmail.senderEmail,
            subject: replySubject,
            body: quotedBody,
            attachment: [],
            isDraft: false,
            isReply: true,
            parentEmailId: originalEmailId,
            threadId: originalEmail.threadId || originalEmailId
        });
    }

    /**
 * Get an email with its thread (full conversation)
 */
    async getEmailThread(emailId: string) {
        try {
            const email = await prismaClient.email.findUnique({
                where: { id: emailId },
                include: {
                    sender: userSelect,
                    receiver: userSelect,
                    replies: {
                        include: {
                            sender: userSelect,
                            receiver: userSelect
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });

            if (!email) return null;

            // If this email is part of a thread, get the root
            if (email.threadId && email.threadId !== emailId) {
                return prismaClient.email.findUnique({
                    where: { id: email.threadId },
                    include: {
                        sender: userSelect,
                        receiver: userSelect,
                        replies: {
                            include: {
                                sender: userSelect,
                                receiver: userSelect
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                });
            }

            return email;
        } catch (error) {
            loggers.error(`Error getting email thread: ${error}`);
            throw new Error('Failed to get email thread');
        }
    }


    async updateEmail(emailId: string, emailData: Partial<EmailDataType>) {
        try {
            const exclusiveFlags = ['isDraft', 'isSent', 'isArchived', 'isSpam'] as const;

            // Find the existing email record
            const existingEmail = await this.getEmailById(emailId);

            if (!existingEmail) {
                throw new Error('Email not found');
            }

            // Determine which exclusive flag (if any) is set to true in the update
            const newTrueFlags = exclusiveFlags.filter((flag) => emailData[flag] === true);

            if (newTrueFlags.length > 1) {
                throw new Error(
                    `Only one of [isDraft, isSent, isArchived, isSpam] can be true. You passed: ${newTrueFlags.join(', ')}`
                );
            }

            // Normalize flags: set all exclusive flags to false except the one being updated to true
            const normalizedFlags = {} as Record<(typeof exclusiveFlags)[number], boolean>;

            for (const flag of exclusiveFlags) {
                normalizedFlags[flag] = newTrueFlags.includes(flag);
            }

            // Step 4: Merge normalized flags with other email data
            const updatePayload: any = {
                ...emailData,
                ...normalizedFlags,
            };

            // Handle attachment array safely
            if (emailData.attachment !== undefined) {
                updatePayload.attachment = { set: emailData.attachment ?? [] };
            }

            // Step 5: Update the email
            return await prismaClient.email.update({
                where: { id: emailId },
                data: updatePayload,
            });
        } catch (error) {
            loggers.error(`Error updating email: ${error}`);
            throw new Error('Failed to update email');
        }
    }


    async markEmailAsRead(emailId: string, isReciever: boolean) {
        try {
            const updateData = isReciever ? { isReadByReceiver: true } : { isReadBySender: true }
            return await prismaClient.email.update({
                where: { id: emailId },
                data: updateData
            })
        } catch (error) {
            loggers.error(`Error reading email: ${error}`)
            throw new Error('Failed to read email')
        }
    }

    async sendDraftEmail(emailId: string) {
        try {
            return await prismaClient.email.update({
                where: { id: emailId },
                data: {
                    isDraft: false,
                    isSent: true,
                    isReadByReceiver: false
                }
            })
        } catch (error) {
            loggers.error(`Error reading email: ${error}`)
            throw new Error('Failed to read email')
        }
    }

    async deleteEmail(emailId: string) {
        try {
            return await prismaClient.email.update({
                where: { id: emailId },
                data: {
                    isDeleted: true
                }
            })
        } catch (error) {
            loggers.error(`Error deleting email: ${error}`)
            throw new Error('Failed to delete email')
        }
    }

    /**
     * Forward an existing email
     */
    async forwardEmail(
        originalEmailId: string,
        senderId: string,
        receiverId: string,
        additionalMessage: string = ""
    ) {
        const originalEmail = await this.getEmailById(originalEmailId);
        if (!originalEmail) {
            throw new Error("Original email not found");
        }

        const forwardedSubject = originalEmail.subject?.startsWith("Fwd:")
            ? originalEmail.subject
            : `Fwd: ${originalEmail.subject}`;

        const forwardedBody = `
            ${additionalMessage}
            
            ---------- Forwarded message ---------
            From: ${originalEmail.senderEmail}
            Date: ${originalEmail.createdAt.toISOString()}
            Subject: ${originalEmail.subject}
            To: ${originalEmail.receiverEmail}
            
            ${originalEmail.body}
        `;

        return this.createEmail({
            senderId,
            receiverId,
            senderEmail: originalEmail.senderEmail,
            receiverEmail: originalEmail.receiverEmail,
            subject: forwardedSubject,
            body: forwardedBody,
            attachment: originalEmail.attachment,
            isDraft: false,
        });
    }


    async bulkUpdateStatus(emailIds: string[], updates: Partial<{ isReadByReceiver: boolean; isArchived: boolean; isStarred: boolean; isSpam: boolean; }>) {
        return prismaClient.email.updateMany({
            where: { id: { in: emailIds } },
            data: updates,
        });
    }

    async getUserEmailsWithBooleans({
        userEmail,
        isDraft,
        isStarred,
        isArchived,
        isSpam,
        page = 1,
        limit = 10,
        search = '',
    }: {
        userEmail: string;
        isDraft?: boolean;
        isStarred?: boolean;
        isArchived?: boolean;
        isSpam?: boolean;
        page?: number;
        limit?: number;
        search?: string;
    }) {
        const whereClause: any = {
            OR: [
                { senderEmail: userEmail },
                { receiverEmail: userEmail }
            ],
            ...(search && {
                OR: [
                    { subject: { contains: search, mode: 'insensitive' } },
                    { body: { contains: search, mode: 'insensitive' } },
                ]
            }),
            ...(typeof isDraft === 'boolean' && { isDraft }),
            ...(typeof isStarred === 'boolean' && { isStarred }),
            ...(typeof isArchived === 'boolean' && { isArchived }),
            ...(typeof isSpam === 'boolean' && { isSpam }),
        };

        const emails = await prismaClient.email.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await prismaClient.email.count({ where: whereClause });

        return {
            emails,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            }
        };
    }


    // async getFolderEmails(userEmail: string, folder: string, page = 1, limit = 10, search = '') {
    //     const baseWhere = {
    //         receiverEmail: userEmail,
    //         isDraft: false,
    //         isSent: true,
    //         OR: [
    //             { subject: { contains: search, mode: 'insensitive' } },
    //             { body: { contains: search, mode: 'insensitive' } },
    //             { senderEmail: { contains: search, mode: 'insensitive' } },
    //         ],
    //     };

    //     const folderFilters: Record<string, object> = {
    //         archived: { isArchived: true },
    //         starred: { isStarred: true },
    //         spam: { isSpam: true },
    //         trash: { isReadByReceiver: true, isArchived: false },
    //         drafts: { isDraft: true, senderEmail: userEmail },
    //         sent: { senderEmail: userEmail, isSent: true },
    //     };

    //     return prismaClient.email.findMany({
    //         where: {
    //             ...baseWhere,
    //             ...(folderFilters[folder] || {}),
    //         },
    //         orderBy: { createdAt: 'desc' },
    //         skip: (page - 1) * limit,
    //         take: limit,
    //     });
    // }


}
export default new EmailService();