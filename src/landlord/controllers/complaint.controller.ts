import { Response } from "express";
import ComplaintService from "../../services/complaintServices";
import { createComplaintSchema, updateComplaintSchema } from "../../validations/schemas/complaint.schema";
import { CustomRequest } from "../../utils/types";



class ComplaintController {

    getAllComplaints = async (req: CustomRequest, res: Response) => {
        try {
            const landlordsId = String(req.user.landlords.id);
            const complaints = await ComplaintService.getAllLandlordComplaints(landlordsId);
            res.status(200).json(complaints);
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