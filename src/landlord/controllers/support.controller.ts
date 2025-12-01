import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import { CreateSupportTicketSchema, UpdateSupportTicketSchema, UpdateSupportTicketStatusSchema } from "../validations/schema/supportSchema";
import { SupportService } from "../../services/support.services";
import NotificationService from "../../services/notification.service";
import { prismaClient } from "../..";
import { userRoles } from "@prisma/client";
import userServices from "../../services/user.services";
class SupportController {
    createTicket = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = CreateSupportTicketSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            const {
                cloudinaryImageUrls = [],
                cloudinaryAudioUrls = [],
                cloudinaryUrls = [],
                cloudinaryVideoUrls = [],
                cloudinaryDocumentUrls = [],
                ...data
            } = value;

            // Merge all Cloudinary URLs into a single attachments array
            const mergedAttachments = [
                ...cloudinaryImageUrls,
                ...cloudinaryAudioUrls,
                ...cloudinaryUrls,
                ...cloudinaryVideoUrls,
                ...cloudinaryDocumentUrls,
            ];

            data.attachments = mergedAttachments;

            // Detect if user is landlord or tenant
            const isLandlord = req.user?.landlords?.id;
            const isTenant = req.user?.tenant?.id;

            if (!isLandlord && !isTenant) {
                return res.status(403).json({ message: "Only landlords or tenants can raise support tickets." });
            }

            const ticket = await SupportService.createTicket({
                landlordId: isLandlord || null,
                tenantId: isTenant || null,
                payload: data,
            });

            // Create notifications for all admin users
            try {
                const adminUsers = await prismaClient.users.findMany({
                    where: {
                        role: {
                            has: userRoles.ADMIN
                        }
                    },
                    select: {
                        id: true,
                        email: true,
                    }
                });
                const user = await userServices.getUserById(req.user.id) as any;

                // Get user name for notification
                const userName = user?.profile?.fullname
                    || (user?.profile?.firstName && user?.profile?.lastName
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user?.email || 'A user');

                // Create notification for each admin user
                const notificationPromises = adminUsers.map(admin => 
                    NotificationService.createNotification({
                        sourceId: user?.id,
                        destId: admin.id,
                        title: 'New Support Ticket',
                        message: `${userName} created a new support ticket: "${data.subject}"`,
                        category: 'COMMUNICATION',
                    })
                );

                await Promise.allSettled(notificationPromises);
            } catch (notifError) {
                // Log error but don't fail ticket creation
                console.error('Error creating notifications for ticket:', notifError);
            }

            return res.status(201).json(ticket);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getLandlordTickets = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search?.toString() || "";

            const result = await SupportService.getLandlordTickets(
                landlordId,
                page,
                limit,
                search
            );

            res.json(result);
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    };
    getLandlordTenantTickets = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search?.toString() || "";

            const result = await SupportService.getTenantSupportTicketsForLandlord(
                landlordId,
                page,
                limit,
                search
            );

            res.json(result);
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }

    getAllTickets = async (req: CustomRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search?.toString() || "";

            const result = await SupportService.getAllTicketsForAdmin(page, limit, search);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    updateTicket = async (req: CustomRequest, res: Response) => {
        try {
            const { ticketId } = req.params;
            const { error, value } = UpdateSupportTicketSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }

            const {
                cloudinaryUrls = [],
                cloudinaryVideoUrls = [],
                cloudinaryDocumentUrls = [],
                cloudinaryAudioUrls = [],
                ...updateData
            } = value;

            // Merge all into attachments
            const allAttachments = [
                ...cloudinaryUrls,
                ...cloudinaryVideoUrls,
                ...cloudinaryDocumentUrls,
                ...cloudinaryAudioUrls,
            ];

            if (allAttachments.length > 0) {
                updateData.attachments = allAttachments;
            }

            const updated = await SupportService.updateTicket(ticketId, updateData);
            res.json(updated);
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }
    getTicket = async (req: CustomRequest, res: Response) => {
        try {
            const { ticketId } = req.params;
            
            // Try to find by ID first, then by ticketCode
            let ticket = await SupportService.getTicketById(ticketId);
            
            // If not found by ID, try by ticketCode
            if (!ticket) {
                ticket = await SupportService.getTicketByCode(ticketId);
            }
            
            if (!ticket) {
                return res.status(404).json({ message: "Ticket not found" });
            }
            
            // Ensure the response includes ticketCode and all necessary fields
            res.json({
                ...ticket,
                ticketCode: ticket.ticketCode,
                status: ticket.status,
            });
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }

    addMessage = async (req: CustomRequest, res: Response) => {
        try {
            const { ticketId } = req.params;
            const { content, attachments = [], isInternal = false } = req.body;

            if (!content || !content.trim()) {
                return res.status(400).json({ message: "Message content is required" });
            }

            const senderId = req.user.id;
            const message = await SupportService.addMessageToTicket(
                ticketId,
                senderId,
                content.trim(),
                attachments,
                isInternal
            );

            // Get updated ticket with all messages
            const updatedTicket = await SupportService.getTicketById(ticketId);

            res.status(201).json({
                success: true,
                data: message,
                ticket: updatedTicket,
                message: "Message added successfully",
            });
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }

    updateTicketStatus = async (req: CustomRequest, res: Response) => {
        try {
            const { ticketId } = req.params;
            const { error, value } = UpdateSupportTicketStatusSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            const updated = await SupportService.updateTicketStatus(ticketId, value.status);
            res.json(updated);
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }

    assignTicket = async (req: CustomRequest, res: Response) => {
        try {
            const { ticketId } = req.params;
            const supportUserId = req.user.id;
            const updated = await SupportService.assignTicket(ticketId, supportUserId);
            res.json(updated);
        } catch (error: any) {
            errorService.handleError(error, res);
        }
    }
}

export default new SupportController();