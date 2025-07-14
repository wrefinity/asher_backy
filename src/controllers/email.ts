import { Request, Response } from "express";
import EmailService, { EmailQueryOptions } from "../services/emailService";
import { CustomRequest, EmailDataType } from "../utils/types";
import { EmailSchema, updateEmailStateSchema, updateEmailSchema } from "../validations/schemas/chats.schema";
import tenantService from "../services/tenant.service";
import { serverInstance } from '../index';
import ErrorService from "../services/error.service";


interface EmailQueryParams {
    isInbox?: boolean;
    isDraft?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    isSpam?: boolean;
    isThrash?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}
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
            console.log("Creating email with body:", value);

            const isDraft = value.isDraft ?? false;

            // Handle optional attachment
            const attachment = value.cloudinaryUrls ?? null;

            // Determine sender email
            let senderEmail: string | null = req.user?.email ?? null;
            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                senderEmail = tenant?.tenantWebUserEmail ?? senderEmail;
            }

            // Prepare email data
            const {
                cloudinaryUrls,
                cloudinaryVideoUrls,
                cloudinaryDocumentUrls,
                cloudinaryAudioUrls,
                receiverEmail,
                ...emailData
            } = value;

            let receiverId: string | null = null;
            let validatedReceiverEmail: string | null = null;

            // Only process receiver for non-draft emails
            if (!isDraft && receiverEmail) {
                // Fetch receiver details
                const receiver = await EmailService.checkUserEmailExists(receiverEmail);
                if (!receiver) {
                    throw new Error('Receiver email not found');
                }
                receiverId = receiver.userId;
                validatedReceiverEmail = receiverEmail;
            }

            // Create email
            const email = await EmailService.createEmail({
                ...emailData,
                senderId: req.user?.id,
                receiverId,
                receiverEmail: validatedReceiverEmail,
                attachment,
                senderEmail,
            }, isDraft);

            if (!email) {
                return res.status(500).json({ message: "Failed to create email" });
            }

            // Only notify recipient for non-draft emails
            if (!isDraft && validatedReceiverEmail) {
                serverInstance.sendToUserEmail(validatedReceiverEmail, "newEmail", email);
            }

            return res.status(201).json({ email });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
    forwardEmail = async (req: CustomRequest, res: Response) => {
        try {

            const { emailId } = req.params;
            const senderId = req.user.id;
            const { receiverEmail, additionalMessage } = req.body;
            if (!receiverEmail) {
                return res.status(400).json({ message: "Receiver email is required" });
            }
            const receiver = await EmailService.checkUserEmailExists(receiverEmail);
            if (!receiver) {
                throw new Error('Receiver email not found');
            }
            // Determine sender email
            let senderEmail: string | null = req.user?.email ?? null;
            if (req.user?.tenant?.id) {
                const tenant = await tenantService.getTenantById(req.user?.tenant?.id);
                senderEmail = tenant?.tenantWebUserEmail ?? senderEmail;
            }

            // Create email
            const email = await EmailService.forwardEmail(emailId, senderId, receiver.userId, senderEmail, receiverEmail, additionalMessage);

            if (!email) {
                return res.status(500).json({ message: "Failed to forward email" });
            }

            return res.status(201).json({ email });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    /**
  * Get paginated emails with thread support
  */
    getUserInbox = async (req: CustomRequest, res: Response) => {
        try {
            const {
                search
            } = req.query;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await EmailService.getInbox(
                req.user.id,
                page,
                limit,
                search ? String(search) : undefined
            );

            res.json(result);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    /**
     * Get user emails based on query parameters
     * @param req - Express request object
     * @param res - Express response object
     */
    async getUserEmail(req: CustomRequest, res: Response) {

        try {
            const userId = req.user.id;
            const query = req.query as EmailQueryParams;

            // Map query parameters to category
            // Note: isInbox is handled by default
            let category: EmailQueryOptions['category'] = 'inbox';

            if (query.isStarred) category = 'starred';
            else if (query.isArchived) category = 'archived';
            else if (query.isDraft) category = 'drafts';
            else if (query.isSpam) category = 'spam';
            else if (query.isThrash) category = 'trash';

            // Call the service
            const result = await EmailService.getEmailsForUser(userId, {
                category,
                search: query.search || '',
                page: query.page ? Number(query.page) : 1,
                limit: query.limit ? Number(query.limit) : 10,
                state: {
                    isStarred: query.isStarred,
                    isArchived: query.isArchived,
                    isSpam: query.isSpam,
                    isDeleted: query.isThrash
                }
            });

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }

    }
    // async getUserEmail(req: CustomRequest, res: Response) {
    //     try {
    //         const { email } = req.user.email ? req.user : req.query;
    //         const {
    //             isDraft,
    //             isStarred,
    //             isArchived,
    //             isSpam,
    //             page = 1,
    //             limit = 10,
    //             search = '',
    //         } = req.query;
    //         console.log("Received request to get user emails with params:", {
    //             email,
    //             isDraft,
    //             isStarred,
    //             isArchived,
    //             isSpam,
    //             page,
    //             limit,
    //             search,
    //         });
    //         const emails = await EmailService.getUserEmailsWithBooleans({
    //             userEmail: email.toString(),
    //             isDraft: isDraft === 'true',
    //             isStarred: isStarred === 'true',
    //             isArchived: isArchived === 'true',
    //             isSpam: isSpam === 'true',
    //             page: parseInt(page as string, 10),
    //             limit: parseInt(limit as string, 10),
    //             search: search as string,
    //         });
    //         res.status(200).json(emails);
    //     } catch (err) {
    //         console.error('Failed to fetch user emails:', err);
    //         res.status(500).json({ error: 'Internal server error' });
    //     }
    // }

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
            console.log("Received request to update email with ID:", req.params.emailId);
            console.log("Updating email with body:", req.body);
            const emailId = String(req.params.emailId);
            //get the email
            const email = await EmailService.getEmailById(emailId);
            if (!email) return res.status(404).json({ message: 'Email not found' })

            //check userId if he owns the email
            if (email.senderEmail !== String(req.user.email)) {
                return res.status(403).json({ message: 'Forbbiden' })
            }
            // Validate request body
            const { error, value } = updateEmailSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            // Handle optional attachment
            const attachment = value.cloudinaryUrls ?? [];

            // unnecessary fields from the value object (without mutating it)
            const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls, ...emailData } = value;

            const updatedEmail = await EmailService.updateEmail(emailId, { ...emailData, attachment });
            return res.status(200).json(updatedEmail)
        } catch (error) {
            return res.status(500).json({ message: "Failed to update email" })
        }
    }
    async updateEmailState(req: CustomRequest, res: Response) {
        try {
            const emailId = req.params.emailId;
            //get the email
            const email = await EmailService.getEmailById(emailId);
            if (!email) return res.status(404).json({ message: 'Email not found' })

            //check userId if he owns the email
            if (email.senderEmail !== String(req.user.email) && email.receiverEmail !== String(req.user.email)) {
                return res.status(403).json({
                    message: 'Forbidden: You are neither the sender nor the receiver of this email'
                });
            }
            // Validate request body
            const { error, value } = updateEmailStateSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }


            const updatedEmail = await EmailService.updateEmailState(emailId, req.user.id, { ...value });
            return res.status(200).json(updatedEmail)
        } catch (error) {
            console.error("Error updating email state:", error);
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
            const emails = await EmailService.getEmailsForUser(req.user.id, { category: "sent" })

            if (!emails) return res.status(200).json({ message: "No sent emails" })
            return res.status(200).json(emails)
        } catch (error) {
            console.error("Error fetching sent emails:", error);
            return res.status(500).json({ message: "Failed to get sent emails" })
        }
    }

    async getUserDraftEmails(req: CustomRequest, res: Response) {
        try {
            const emails = await EmailService.getEmailsForUser(req.user.id, { category: "drafts" })
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

            const emails = await EmailService.getEmailsForUser(req.user.id, {
                unread: true,
                received: true,    // only messages where user is receiver
                category: 'inbox',
            });
            if (!emails) return res.status(200).json({ message: "No Unread Emails" })
            return res.status(200).json(emails)
        } catch (error) {
            return res.status(500).json({ message: "Couldnt get unread emails" })
        }
    }


    replyToEmail = async (req: CustomRequest, res: Response) => {
        try {
            const { originalEmailId, additionalMessage } = req.body;
            const senderId = req.user.id; // From authentication

            const email = await EmailService.replyToEmail(
                originalEmailId,
                senderId,
                additionalMessage
            );

            res.status(201).json(email);
        } catch (error) {
            res.status(400).json({ message: error.message });
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