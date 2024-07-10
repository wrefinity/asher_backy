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


    async createEmail(emailData: any) {
        try {
            const recieverEmail = await UserService.findUserByEmail(emailData.recieverEmail)
            if (!recieverEmail) {
                throw new Error('Reciever email is invalid');
            }
            emailData.isDraft = emailData.isDraft ?? true;
            emailData.isSent = (emailData.isDraft === true) ? false : true;
            emailData.isReadBySender = true;
            emailData.isReadByReciever = false;

            delete (emailData.cloudinaryUrls)
          
            return await prismaClient.email.create({
                data: emailData,
            })
        } catch (error) {
            loggers.error(`Error creating email: ${error}`)
            throw new Error('Failed to create email')
        }
    }

    async getEmailById(emailId: string) {
        try {
            return await prismaClient.email.findUnique({
                where: { id: emailId },
                include: {
                    sender: userSelect,
                    reciver: userSelect
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
        if (options.unread) {
            if (options.sent) {
                where.isReadBySender = false;
            } else if (options.recieved) {
                where.isReadByReciever = false;
            } else {
                where.OR = [
                    { senderEmail: email, isReadBySender: false },
                    { receiverEmail: email, isReadByReciever: false }
                ]
            }
        };


        try {
            return await prismaClient.email.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: userSelect,
                    reciver: userSelect
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
                data: emailData
            })
        } catch (error) {
            loggers.error(`Error updating email: ${error}`)
            throw new Error('Failed to update email')
        }
    }

    async markEmailAsRead(emailId: string, isReciever: boolean) {
        try {
            const updateData = isReciever ? { isReadByReciever: true } : { isReadBySender: true }
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
                    isReadByReciever: false
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