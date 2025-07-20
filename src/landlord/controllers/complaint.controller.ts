import { Response } from "express";
import ComplaintService from "../../services/complaintServices";
import { createComplaintSchema, updateComplaintSchema } from "../../validations/schemas/complaint.schema";
import { CustomRequest } from "../../utils/types";



class ComplaintController {

    getComplaintStatistics = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ message: 'Unauthorized: Not a landlord' });

            const stats = await ComplaintService.getComplaintStats(landlordId);
            res.status(200).json(stats);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to fetch complaint statistics' });
        }
    }

    getAllComplaints = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ message: 'Unauthorized: Not a landlord' });

            const { page = '1', limit = '10', status, category, priority } = req.query;

            const result = await ComplaintService.getLandlordComplaints(
                landlordId,
                parseInt(page as string),
                parseInt(limit as string),
                {
                    status: status as any,
                    category: category as any,
                    priority: priority as any,
                }
            );
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: "Error fetching complaints" });
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


}

export default new ComplaintController()