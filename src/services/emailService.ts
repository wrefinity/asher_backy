import { prismaClient } from "..";
import loggers from "../utils/loggers";
import { EmailDataType } from "../utils/types";
import UserService from "./userServices";

const profileSelect = {
    select: {
        fullname: true,
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

class EmailService {
    userService: UserService
    constructor() {
        this.userService = new UserService()
    }

    async createEmail(emailData: EmailDataType) {
        try {
            const recieverEmail = await this.userService.findUserByEmail(emailData.recieverEmail)
            if (!recieverEmail) {
                throw new Error('Reciever email is invalid');
            }
            return await prismaClient.email.create({
                data: emailData,
            })
        } catch (error) {
            loggers.error(`Error creating email: ${error}`)
            throw new Error('Failed to create email')
        }
    }

    async getEmailById(emailId: bigint) {
        try {
            return await prismaClient.email.findUnique({
                where: { id: emailId },
                include: {
                    from: userSelect,
                    to: userSelect
                }
            })
        } catch (error) {
            loggers.error(`Error getting email: ${error}`)
            throw new Error('Failed to get email')
        }
    }

    async getUserEmails(email: string, options: {
        sent?: boolean;
        recieved?: boolean;
        draft?: boolean;
        unread?: boolean;
    }) {
        const where: any = {};

        if (options.sent) where.senderEmail = email
        if (options.recieved) where.recieverEmail = email
        if (options.draft) where.isDraft = true;
        if (options.unread) where.isRead = false;


        try {
            return await prismaClient.email.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    from: userSelect,
                    to: userSelect
                }
            })
        } catch (error) {
            loggers.error(`Error getting email: ${error}`)
            throw new Error('Failed to get email')
        }
    }

    async updateEmail(emailId: bigint, emailData: Partial<EmailDataType>) {
        try {
            return await prismaClient.email.update({
                where: { id: emailId },
                data: emailData
            })
        } catch (error) {
            loggers.error(`Error updating email: ${error}`)
            throw new Error('Failed to update email')
        }
    }

    async markEmailAsRead(emailId: bigint) {
        return this.updateEmail(emailId, { isRead: true })
    }

    async sendDraftEmail(emailId: bigint) {
        return this.updateEmail(emailId, { isDraft: false, isSent: true })
    }

    async deleteEmail(emailId: bigint) {
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
export default EmailService;