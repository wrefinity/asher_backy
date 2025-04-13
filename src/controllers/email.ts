import { Request, Response } from "express";
import EmailService from "../services/emailService";
import { CustomRequest, EmailDataType } from "../utils/types";
import { EmailSchema } from "../validations/schemas/chats.schema";
import tenantService from "../services/tenant.service";
import { serverInstance } from '../index'; //
import ErrorService from "../services/error.service";

class EmailController {

    constructor() {
    }

    createEmail = async (req: CustomRequest, res: Response) => {
        try {
            // Validate request body
            const { error, value } = EmailSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            // Handle optional attachment
            const attachment = value.cloudinaryUrls ?? null;

            // Determine sender email
            let senderEmail: string | null = req.user?.email ?? null;
            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                senderEmail = tenant?.tenantWebUserEmail ?? senderEmail;
            }

            // Fetch sender details
            const receiver = await EmailService.checkUserEmailExists(value.receiverEmail);
            if (!receiver) {
                throw new Error('Receiver email not found');
            }
            // unnecessary fields from the value object (without mutating it)
            const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls, ...emailData } = value;

            // Create email
            const email = await EmailService.createEmail({ ...emailData, senderId: req.user?.id, receiverId: receiver.userId, attachment, senderEmail });
            if (!email) {
                return res.status(500).json({ message: "Failed to create email" });
            }
            // Notify the recipient in real-time
            serverInstance.sendToUserEmail(email.receiverEmail, "newEmail", email);


            return res.status(201).json({ email });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }


    getUserInbox = async (req: CustomRequest, res: Response) => {
        try {
            let email = null;

            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                email = tenant?.tenantWebUserEmail;
            } else {
                email = String(req.user.email);
            }
            const emails = await EmailService.getUserEmails(email, { recieved: true })
            if (emails.length < 1) return res.status(200).json({ message: 'No emails found ' })
            return res.status(200).json({ emails })

        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: 'Failed to fetch email' })

        }
    }

    async getEmailById(req: CustomRequest, res: Response) {
        try {
            const emailId = String(req.params.emailId);
            const email = await EmailService.getEmailById(emailId)
            if (!email) return res.status(404).json({ message: "Email not found" })
            return res.status(200).json(email)
        } catch (error) {
            return res.status(500).json({ message: "Failed to get email" })
        }
    }

    async updateEmail(req: CustomRequest, res: Response) {
        try {
            const emailId = String(req.params.emailId);
            //get the email
            const email = await EmailService.getEmailById(emailId);
            if (!email) return res.status(404).json({ message: 'Email not found' })

            //check userId if he owns the email
            if (email.senderEmail !== String(req.user.email)) {
                return res.status(403).json({ message: 'Forbbiden' })
            }
            const updatedEmail = await EmailService.updateEmail(emailId, req.body);
            return res.status(200).json(updatedEmail)
        } catch (error) {
            return res.status(500).json({ message: "Failed to update email" })
        }
    }

    async deleteEmail(req: CustomRequest, res: Response) {
        try {
            const emailId = String(req.params.emailId)
            //get the email
            const email = await EmailService.getEmailById(emailId);
            if (!email) return res.status(404).json({ message: 'Email not found' })

            //check userId if he owns the email
            if (email.senderEmail !== String(req.user.email)) {
                return res.status(403).json({ message: 'Forbbiden' })
            }

            //store the email in fail safe db

            await EmailService.deleteEmail(emailId)
            return res.status(200).json({ message: "Email deleted successfully" })
        } catch (error) {
            return res.status(500).json({ message: "Failed to delete email" })
        }
    }

    async getUserSentEmails(req: CustomRequest, res: Response) {
        try {
            let email = null;
            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                email = tenant?.tenantWebUserEmail;
            } else {
                email = String(req.user.email);
            }
            const emails = await EmailService.getUserEmails(email, { sent: true })
            if (emails.length < 1) return res.status(200).json({ message: "No sent emails" })
            return res.status(200).json(emails)
        } catch (error) {
            return res.status(500).json({ message: "Failed to get sent emails" })
        }
    }

    async getUserDraftEmails(req: CustomRequest, res: Response) {
        try {
            const email = String(req.user.email)
            const emails = await EmailService.getUserEmails(email, { draft: true })
            if (emails.length < 1) return res.status(200).json({ message: "No draft emails" })
            return res.status(200).json(emails)
        } catch (error) {
            return res.status(500).json({ message: "Couldnt get Draft emails" })
        }
    }

    async getUserUnreadEmails(req: CustomRequest, res: Response) {
        try {
            let email = null;
            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                email = tenant?.tenantWebUserEmail;
            } else {
                email = String(req.user.email);
            }
            const emails = await EmailService.getUserEmails(email, { recieved: true, unread: true })
            if (emails.length < 1) return res.status(200).json({ message: "No Unread Emails" })
            return res.status(200).json(emails)
        } catch (error) {
            return res.status(500).json({ message: "Couldnt get unread emails" })
        }
    }

    async markEmailAsRead(req: CustomRequest, res: Response) {
        try {
            const emailId = String(req.params.emailId)

            const email = await EmailService.getEmailById(emailId)
            if (!email) return res.status(404).json({ message: 'Email not found' })

            let receiverEmail = null;

            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                receiverEmail = tenant?.tenantWebUserEmail;
            } else {
                receiverEmail = String(req.user.email);
            }
            const isReciever = email.receiverEmail === receiverEmail;

            if (email.senderEmail !== receiverEmail && !isReciever) {
                return res.status(403).json({ message: 'Forbbiden' })
            }
            const updatedEmail = await EmailService.markEmailAsRead(emailId, isReciever)
            return res.status(200).json(updatedEmail)
        } catch (error) {
            return res.status(500).json({ message: "Couldnt read email" })
        }
    }

    async sendDraftEmail(req: CustomRequest, res: Response) {
        try {
            const emailId = String(req.params.emailId)

            const email = await EmailService.getEmailById(emailId)
            if (!email) return res.status(404).json({ message: 'Email not found' })

            if (email.senderEmail !== String(req.user.email)) {
                return res.status(403).json({ message: 'Forbbiden' })
            }
            const sentEmail = await EmailService.sendDraftEmail(emailId)
            return res.status(200).json(sentEmail)
        } catch (error) {
            return res.status(500).json({ message: "Couldn't send email" })
        }
    }
}

export default new EmailController()