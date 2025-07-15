import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import broadcastService from "../services/broadcast.service";
import { BroadcastType } from "@prisma/client";

class BroadcastController {
    constructor() { }

    // BROADCAST CATEGORY

    createBroadcastCategory = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { name, location, propertyId, memberIds } = req.body;

        if (!name || !memberIds || !Array.isArray(memberIds)) {
            return res.status(400).json({ message: "Name and memberIds array are required" });
        }

        try {
            const category = await broadcastService.createBroadcastCategory({
                name,
                location,
                propertyId,
                memberIds
            }, landlordId);
            return res.status(201).json(category);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getBroadcastCategories = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const categories = await broadcastService.getBroadcastCategories(landlordId);
            return res.status(200).json(categories);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getBroadcastCategoryById = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;

        try {
            const category = await broadcastService.getBroadcastCategoryById(categoryId, landlordId);
            if (!category) {
                return res.status(404).json({ message: "Category not found" });
            }
            return res.status(200).json(category);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    updateBroadcastCategory = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;
        const { name, location, propertyId } = req.body;

        try {
            const result = await broadcastService.updateBroadcastCategory(categoryId, {
                name,
                location,
                propertyId
            }, landlordId);
            return res.status(200).json({ message: "Category updated successfully", result });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    deleteBroadcastCategory = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;

        try {
            await broadcastService.deleteBroadcastCategory(categoryId, landlordId);
            return res.status(200).json({ message: "Category deleted successfully" });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    // CATEGORY MEMBERS

    addMembersToCategory = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;
        const { memberIds } = req.body;

        if (!memberIds || !Array.isArray(memberIds)) {
            return res.status(400).json({ message: "memberIds array is required" });
        }

        try {
            const result = await broadcastService.addMembersToCategory(categoryId, memberIds, landlordId);
            return res.status(200).json({ message: "Members added successfully", result });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    removeMembersFromCategory = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;
        const { memberIds } = req.body;

        if (!memberIds || !Array.isArray(memberIds)) {
            return res.status(400).json({ message: "memberIds array is required" });
        }

        try {
            const result = await broadcastService.removeMembersFromCategory(categoryId, memberIds, landlordId);
            return res.status(200).json({ message: "Members removed successfully", result });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getCategoryMembers = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { categoryId } = req.params;

        try {
            const members = await broadcastService.getCategoryMembers(categoryId, landlordId);
            return res.status(200).json(members);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    // BROADCAST METHODS

    createAndSendBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { subject, message, type, categoryId, extraMemberIds, scheduledAt, action } = req.body;

        if (!subject || !message || !type || !categoryId || !action) {
            return res.status(400).json({
                message: "Subject, message, type, categoryId, and action are required"
            });
        }

        if (!Object.values(BroadcastType).includes(type)) {
            return res.status(400).json({ message: "Invalid broadcast type" });
        }

        if (!['send', 'schedule', 'draft'].includes(action)) {
            return res.status(400).json({ message: "Action must be 'send', 'schedule', or 'draft'" });
        }

        if (action === 'schedule' && !scheduledAt) {
            return res.status(400).json({ message: "scheduledAt is required when action is 'schedule'" });
        }

        try {
            const broadcast = await broadcastService.createAndSendBroadcast({
                subject,
                message,
                type,
                categoryId,
                extraMemberIds,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                action
            }, landlordId, userId);

            return res.status(201).json(broadcast);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    createBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { subject, message, type, categoryId, extraMemberIds, scheduledAt, isDraft } = req.body;

        if (!subject || !message || !type || !categoryId) {
            return res.status(400).json({
                message: "Subject, message, type, and categoryId are required"
            });
        }

        if (!Object.values(BroadcastType).includes(type)) {
            return res.status(400).json({ message: "Invalid broadcast type" });
        }

        try {
            const broadcast = await broadcastService.createBroadcast({
                subject,
                message,
                type,
                categoryId,
                extraMemberIds,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                isDraft
            }, landlordId, userId);

            return res.status(201).json(broadcast);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    // DRAFT BROADCAST

    getDraftBroadcasts = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const drafts = await broadcastService.getDraftBroadcasts(landlordId);
            return res.status(200).json(drafts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    updateDraftBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.params;
        const { subject, message, type, categoryId, extraMemberIds } = req.body;

        try {
            const broadcast = await broadcastService.updateDraftBroadcast(broadcastId, {
                subject,
                message,
                type,
                categoryId,
                extraMemberIds
            }, landlordId);

            return res.status(200).json(broadcast);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    sendDraftBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.params;

        try {
            const result = await broadcastService.sendDraftBroadcast(broadcastId, landlordId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    sendBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.params;

        try {
            const result = await broadcastService.sendBroadcast(broadcastId, landlordId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getScheduledBroadcasts = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const broadcasts = await broadcastService.getScheduledBroadcasts(landlordId);
            return res.status(200).json(broadcasts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    sendScheduledBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.params;

        try {
            const result = await broadcastService.sendScheduledBroadcast(broadcastId, landlordId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    cancelScheduledBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.params;

        try {
            await broadcastService.cancelScheduledBroadcast(broadcastId, landlordId);
            return res.status(200).json({ message: "Scheduled broadcast cancelled successfully" });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getBroadcastById = async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const broadcast = await broadcastService.getBroadcastById(id, landlordId);
            if (!broadcast) return res.status(404).json({ message: "Broadcast not found" });
            return res.status(200).json(broadcast);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getBroadcastsByCategory = async (req: CustomRequest, res: Response) => {
        const { categoryId } = req.params;
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const broadcasts = await broadcastService.getBroadcastsByCategory(categoryId, landlordId);
            return res.status(200).json(broadcasts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getBroadcastsByLandlord = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const broadcasts = await broadcastService.getBroadcastsByLandlord(landlordId);
            return res.status(200).json(broadcasts);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getStats = async (req: CustomRequest, res: Response) => {
        const { landlords } = req.user;
        const landlordId = landlords?.id;

        try {
            const stats = await broadcastService.stats(landlordId);
            return res.status(200).json(stats);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getAllUsers = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ message: "Login as landlord to get all users" }); // TODO: Fix this
        }
        try {
            const users = await broadcastService.getAllUsers();
            return res.status(200).json(users);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    resendBroadcast = async (req: CustomRequest, res: Response) => {
        const { landlords, id: userId } = req.user;
        const landlordId = landlords?.id;
        const { broadcastId } = req.body;

        try {
            const result = await broadcastService.resendBroadcast(broadcastId, landlordId, userId);
            return res.status(200).json(result);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new BroadcastController();