import { Response } from "express";
import ComplaintService from "../services/complaintServices";
import { createComplaintSchema, updateComplaintSchema } from "../validations/schemas/complaint.schema";
import { CustomRequest } from "../utils/types";
import { postComplaintMessageSchema } from "../landlord/validations/schema/complaintSchema";


class ComplaintController {
    createComplaint = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createComplaintSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });
            const createdById = String(req.user.id);
            const complaint = await ComplaintService.createComplaint({ ...value, createdById });
            res.status(201).json(complaint);
        } catch (error) {
            res.status(500).json({ message: "Error creating complaint" });
        }
    }

    getAllComplaints = async (req: CustomRequest, res: Response) => {
        try {
            const createdBy = String(req.user.id);
            const complaints = await ComplaintService.getAllComplaints(createdBy);
            res.status(200).json(complaints);
        } catch (error) {
            res.status(500).json({ message: "Error fetching complaints" });
        }
    }

    getComplaintById = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const complaint = await ComplaintService.getComplaintById(id);
            if (!complaint) return res.status(404).json({ message: "Complaint not found" });

            res.status(200).json({ complaint });
        } catch (error) {
            res.status(500).json({ message: "Error fetching complaint" });
        }
    }

    updateComplaint = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { error, value } = updateComplaintSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });

            const complaint = await ComplaintService.getComplaintById(id);
            if (!complaint) return res.status(404).json({ message: "Complaint not found" });

            const updatedComplaint = await ComplaintService.updateComplaint(id, value);
            res.status(200).json({ updatedComplaint });
        } catch (error) {
            res.status(500).json({ message: "Error updating complaint" });
        }
    }

    deleteComplaint = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const complaint = await ComplaintService.getComplaintById(id);
            if (!complaint) return res.status(404).json({ message: "Complaint not found" });
            const complaintExists = await ComplaintService.getComplaintById(id);
            if (!complaintExists) return res.status(404).json({ message: "Complaint does not exist" }); 
            const deletedComplaint = await ComplaintService.deleteComplaint(id);
            res.status(200).json({ message: "Complaint deleted successfully", deletedComplaint });
        } catch (error) {
            res.status(500).json({ message: "Error deleting complaint" });
        }
    }
    getMessages = async (req: CustomRequest, res: Response) => {
        const { complaintId } = req.params;
        try {
            const messages = await ComplaintService.getMessages(complaintId);
            return res.json({ success: true, messages });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }

    postMessage = async (req: CustomRequest, res: Response) => {
        const { complaintId } = req.params;
        const senderId = String(req.user.id);
        if (!complaintId) {
            return res.status(400).json({ error: 'Complaint ID is required' });
        }

        if (!senderId) {
            return res.status(400).json({ error: 'Sender ID is required' });
        }
        const { error } = postComplaintMessageSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                errors: error.details.map((detail) => detail.message),
            });
        }
        const {message } = req.body;
        try {
            const msg = await ComplaintService.postMessage(complaintId, senderId, message);
            return res.status(201).json({ success: true, message: msg });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to post message' });
        }
    }
}

export default new ComplaintController()