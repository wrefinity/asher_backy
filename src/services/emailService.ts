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
    id: string; // Unique identifier for the email
    senderEmail: string; // Email address of the sender (either user.email or tenant.tenantWebUserEmail)
    receiverEmail: string; // Email address of the receiver (either user.email or tenant.tenantWebUserEmail)
    subject?: string; // Subject of the email
    body: string; // Body/content of the email
    attachment: string[]; // Array of file paths or URLs for attachments
    isReadBySender?: boolean; // Indicates if the sender has read the email
    isReadByReceiver?: boolean; // Indicates if the receiver has read the email
    isDraft?: boolean; // Indicates if the email is a draft
    isSent?: boolean;
    // Relationships
    senderId: string; // ID of the sender (user)  
    receiverId: string; // ID of the receiver (user)
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

    createEmail = async (emailData: EmailIF) => {

        const { senderId, receiverId, ...rest } = emailData

        // Create email record in the database
        return await prismaClient.email.create({
            data: {
                ...rest,
                isDraft: false,
                isSent: true,
                sender: { connect: { id: senderId } },
                receiver: { connect: { id: receiverId } },
            },
        });
    }

    async getEmailById(emailId: string) {
        try {
            return await prismaClient.email.findUnique({
                where: { id: emailId },
                // include: {
                //     sender: userSelect,
                //     receiver: userSelect
                // }
            })
        } catch (error) {
            loggers.error(`Error getting email: ${error}`)
            throw new Error('Failed to get email')
        }
    }

    getUserEmails = async (email: string, options: {
        sent?: boolean;
        recieved?: boolean;
        draft?: boolean;
        unread?: boolean;
    }) => {
        const where: any = {};

        if (options.sent) where.senderEmail = email
        if (options.recieved) where.receiverEmail = email
        if (options.draft) where.isDraft = true;
        if (options.unread) {
            if (options.sent) {
                where.isReadBySender = false;
            } else if (options.recieved) {
                where.isReadByReceiver = false;
            } else {
                where.OR = [
                    { senderEmail: email, isReadBySender: false },
                    { receiverEmail: email, isReadByReceiver: false }
                ]
            }
        };

        try {
            return await prismaClient.email.findMany({
                where,
                orderBy: { createdAt: 'desc' },
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

    async updateEmail(emailId: string, emailData: Partial<EmailDataType>) {
        try {
            return await prismaClient.email.update({
                where: { id: emailId },
                data: emailData as any
            })
        } catch (error) {
            loggers.error(`Error updating email: ${error}`)
            throw new Error('Failed to update email')
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
            return await prismaClient.email.delete({
                where: { id: emailId },
            })
        } catch (error) {
            loggers.error(`Error deleting email: ${error}`)
            throw new Error('Failed to delete email')
        }
    }
}
export default new EmailService();