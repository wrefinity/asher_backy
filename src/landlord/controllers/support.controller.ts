import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import { CreateSupportTicketSchema, UpdateSupportTicketSchema, UpdateSupportTicketStatusSchema } from "../validations/schema/supportSchema";
import { SupportService } from "../../services/support.services";
class SupportController {
    createTicket = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;

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

            // Assign merged attachments
            data.attachments = mergedAttachments;

            const ticket = await SupportService.createTicket(landlordId, data);
            res.status(201).json(ticket);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
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
            const ticket = await SupportService.getTicketById(ticketId);
            if (!ticket) {
                return res.status(404).json({ message: "Ticket not found" });
            }
            res.json(ticket);
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