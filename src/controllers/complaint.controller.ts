import { Response } from "express";
import ComplaintService from "../services/complaintServices";
import { createComplaintSchema } from "../validations/schemas/complaint.schema";
import { CustomRequest } from "../utils/types";



class ComplaintController {
    createComplaint = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createComplaintSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });
            const createdById = String(req.user.id);
            const complaint = await ComplaintService.createComplaint({ ...value, createdById });
            res.status(201).json(complaint);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Error creating complaint" });
        }
    }

    getAllComplaints = async (req: CustomRequest, res: Response) => {
        try {
            const createdBy = String(req.user.id);
            console.log("current user=======")
            console.log(createdBy)
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
            const { error, value } = createComplaintSchema.validate(req.body);
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

            const deletedComplaint = await ComplaintService.deleteComplaint(id);
            res.status(200).json({ message: "Complaint deleted successfully", deletedComplaint });
        } catch (error) {
            res.status(500).json({ message: "Error deleting complaint" });
        }
    }
}

export default new ComplaintController()